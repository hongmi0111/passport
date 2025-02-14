// ----- Types
import type { Provider, ProviderOptions } from "../../types";
import type { RequestPayload, VerifiedPayload } from "@gitcoin/passport-types";

// ----- Libs
import axios from "axios";

// ----- Credential verification
import { getAddress } from "../../utils/signer";

// This is used in the Era Explorer
export const zkSyncEraApiEndpoint = "https://zksync2-mainnet-explorer.zksync.io/";

type ZKSyncEraTransaction = {
  initiatorAddress: string;
  status: string;
};

type ZkSyncEraResponse = {
  list: ZKSyncEraTransaction[];
  total: number;
};

// Export a Provider to verify ZkSync Era Transactions
export class ZkSyncEraProvider implements Provider {
  // Give the provider a type so that we can select it with a payload
  type = "ZkSyncEra";

  // Options can be set here and/or via the constructor
  _options = {};

  // construct the provider instance with supplied options
  constructor(options: ProviderOptions = {}) {
    this._options = { ...this._options, ...options };
  }

  // Verify that address defined in the payload has at least 1 verified transaction
  async verify(payload: RequestPayload): Promise<VerifiedPayload> {
    // if a signer is provider we will use that address to verify against
    let valid = false;
    let error = undefined;

    const address = (await getAddress(payload)).toLowerCase();

    try {
      const requestResponse = await axios.get(`${zkSyncEraApiEndpoint}transactions`, {
        params: {
          limit: 100,
          direction: "older",
          accountAddress: address,
        },
      });

      if (requestResponse.status == 200) {
        const zkSyncResponse = requestResponse.data as ZkSyncEraResponse;

        // We consider the verification valid if this account has at least one verified
        // transaction initiated by this account
        for (let i = 0; i < zkSyncResponse.list.length; i++) {
          const t = zkSyncResponse.list[i];
          if (t.status === "verified" && t.initiatorAddress === address) {
            valid = true;
            break;
          }
        }

        if (!valid) {
          error = ["Unable to find a verified transaction from the given address"];
        }
      } else {
        error = [`HTTP Error '${requestResponse.status}'. Details: '${requestResponse.statusText}'.`];
      }
    } catch (exc) {
      error = ["Error getting transaction list for address"];
    }
    return Promise.resolve({
      valid: valid,
      record: valid
        ? {
            address: address,
          }
        : undefined,
      error,
    });
  }
}
