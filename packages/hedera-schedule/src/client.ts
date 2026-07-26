// Deferred settlement on Hedera testnet.
//
// Product: the agent locks terms; the guest carries payment risk. On the hack
// demo the gateway operator signs the schedule so HashScan shows a real op —
// production would collect the guest's key / allowance instead.
//
// Graph context stays in the gateway: ?address= → context-bands MCP → decide().
// Only when earnsRateLock(terms) should the gateway call into this package.

import {
  AccountBalanceQuery,
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  ScheduleCreateTransaction,
  ScheduleId,
  ScheduleInfoQuery,
  ScheduleSignTransaction,
  Status,
  TransferTransaction,
} from "@hashgraph/sdk";
import { loadHederaEnv, type HederaEnv } from "./env.js";
import { scheduleUrl, transactionUrl } from "./hashscan.js";

export type SettlementSchedule = {
  scheduleId: string;
  scheduleUrl: string;
  /** Present when the network already executed (all signatures at create). */
  executedTransactionId: string | null;
  executedTransactionUrl: string | null;
  memo: string;
};

export type SettlementExecution = {
  scheduleId: string;
  scheduleUrl: string;
  transactionId: string;
  transactionUrl: string;
};

export class HederaScheduleError extends Error {
  constructor(
    message: string,
    readonly code:
      | "no_credentials"
      | "create_failed"
      | "execute_failed"
      | "not_found",
  ) {
    super(message);
    this.name = "HederaScheduleError";
  }
}

/** Portal ECDSA keys are often `0x` + 64 hex; ED25519 may be DER or raw hex. */
function parseKey(raw: string): PrivateKey {
  const trimmed = raw.trim();
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    try {
      return PrivateKey.fromStringECDSA(hex);
    } catch {
      /* fall through — some portals still issue ED25519 as 32-byte hex */
    }
  }
  try {
    return PrivateKey.fromStringDer(trimmed);
  } catch {
    return PrivateKey.fromStringED25519(trimmed);
  }
}

function operatorClient(): { client: Client; env: HederaEnv } {
  let env: HederaEnv;
  try {
    env = loadHederaEnv();
  } catch (err) {
    throw new HederaScheduleError((err as Error).message, "no_credentials");
  }
  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(env.accountId), parseKey(env.privateKey));
  return { client, env };
}

/**
 * Schedule a small HBAR settlement transfer. Memo ties it to the hotel hold.
 * Amount is demo-sized; the hotel USD price stays on the off-chain rate sheet.
 */
export async function createSettlementSchedule(input: {
  partnerOrderId: string;
  amountHbar?: number;
  /**
   * Set when the network has already seen this exact schedule.
   *
   * A scheduled transaction is identified by its contents, and ours are built
   * from the hold, so two runs against the same hold are byte identical and
   * Hedera answers IDENTICAL_SCHEDULE_ALREADY_CREATED. That is correct of it and
   * useless to us: the cached snapshot carries one order id, so the first demo
   * run created the schedule and every run afterwards looked like Hedera was
   * broken. A distinct memo makes this run's settlement its own schedule, which
   * is what it is.
   */
  attempt?: string;
}): Promise<SettlementSchedule> {
  const { client, env } = operatorClient();
  const amount = input.amountHbar ?? 0.01;
  const memo = `bookerbob:${input.partnerOrderId}${input.attempt ? `:${input.attempt}` : ""}`.slice(
    0,
    100,
  );
  const operatorId = AccountId.fromString(env.accountId);
  const payeeId = AccountId.fromString(env.payeeAccountId);

  try {
    const transfer = new TransferTransaction()
      .addHbarTransfer(operatorId, new Hbar(-amount))
      .addHbarTransfer(payeeId, new Hbar(amount));

    const response = await new ScheduleCreateTransaction()
      .setScheduledTransaction(transfer)
      .setScheduleMemo(memo)
      .execute(client);

    const receipt = await response.getReceipt(client);
    if (!receipt.scheduleId) {
      throw new HederaScheduleError(
        "ScheduleCreate returned no scheduleId",
        "create_failed",
      );
    }

    const scheduleId = receipt.scheduleId.toString();
    const executedId = receipt.scheduledTransactionId?.toString() ?? null;

    return {
      scheduleId,
      scheduleUrl: scheduleUrl(scheduleId),
      executedTransactionId: executedId,
      executedTransactionUrl: executedId ? transactionUrl(executedId) : null,
      memo,
    };
  } catch (err) {
    if (err instanceof HederaScheduleError) throw err;

    // The same hold scheduled twice is not an error, it is the same schedule.
    //
    // The memo carries the partner order id, so a second attempt for one hold
    // builds a byte-identical scheduled transaction and Hedera answers
    // IDENTICAL_SCHEDULE_ALREADY_CREATED with the existing schedule in the
    // receipt. That is exactly what we want back. It bit us because the cached
    // snapshot has one fixed order id: the first demo run created the schedule
    // and every run after it looked like Hedera was broken.
    const identical = /IDENTICAL_SCHEDULE_ALREADY_CREATED/.test((err as Error).message);
    const existing = (err as { receipt?: { scheduleId?: { toString(): string } } })
      .receipt?.scheduleId;

    // The receipt names the existing schedule when the network chooses to send
    // it. Measured on testnet: it does not always, and then the only way to end
    // up with a schedule for this run is to make one that is not identical.
    if (identical && !existing && !input.attempt) {
      client.close();
      return createSettlementSchedule({
        ...input,
        attempt: Date.now().toString(36),
      });
    }

    if (existing) {
      const scheduleId = existing.toString();
      return {
        scheduleId,
        scheduleUrl: scheduleUrl(scheduleId),
        executedTransactionId: null,
        executedTransactionUrl: null,
        memo,
      };
    }

    throw new HederaScheduleError(
      `ScheduleCreate failed: ${(err as Error).message}`,
      "create_failed",
    );
  } finally {
    client.close();
  }
}

/**
 * Ensure the schedule has executed (sign if still pending). Idempotent when
 * the network already ran it at create time.
 */
export async function executeSchedule(
  scheduleId: string,
): Promise<SettlementExecution> {
  const { client } = operatorClient();
  const id = ScheduleId.fromString(scheduleId);

  try {
    const info = await new ScheduleInfoQuery().setScheduleId(id).execute(client);

    if (info.executed != null) {
      const txId =
        info.scheduledTransactionId?.toString() ?? `${scheduleId}@executed`;
      return {
        scheduleId,
        scheduleUrl: scheduleUrl(scheduleId),
        transactionId: txId,
        transactionUrl: transactionUrl(txId),
      };
    }

    const sign = await new ScheduleSignTransaction()
      .setScheduleId(id)
      .execute(client);
    const receipt = await sign.getReceipt(client);
    if (
      receipt.status !== Status.Success &&
      receipt.status !== Status.ScheduleAlreadyExecuted
    ) {
      throw new HederaScheduleError(
        `ScheduleSign status ${receipt.status.toString()}`,
        "execute_failed",
      );
    }

    const after = await new ScheduleInfoQuery().setScheduleId(id).execute(client);
    const txId =
      after.scheduledTransactionId?.toString() ??
      sign.transactionId?.toString() ??
      scheduleId;

    return {
      scheduleId,
      scheduleUrl: scheduleUrl(scheduleId),
      transactionId: txId,
      transactionUrl: transactionUrl(txId),
    };
  } catch (err) {
    if (err instanceof HederaScheduleError) throw err;
    throw new HederaScheduleError(
      `executeSchedule failed: ${(err as Error).message}`,
      "execute_failed",
    );
  } finally {
    client.close();
  }
}

export async function getOperatorBalanceHbar(): Promise<number> {
  const { client, env } = operatorClient();
  try {
    const balance = await new AccountBalanceQuery()
      .setAccountId(env.accountId)
      .execute(client);
    return balance.hbars.toBigNumber().toNumber();
  } finally {
    client.close();
  }
}
