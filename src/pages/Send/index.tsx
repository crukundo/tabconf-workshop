import { useState } from "react";
import { Psbt } from "bitcoinjs-lib";

import { broadcastTx } from "src/utils/blockstream-api";

import CreateTxForm from "./components/CreateTxForm";
import TransactionSummary from "./components/TransactionSummary";

import { Address, DecoratedUtxo } from "src/types";

import { createTransaction, signTransaction } from "src/utils/bitcoinjs-lib"

interface Props {
  utxos: DecoratedUtxo[];
  changeAddresses: Address[];
  mnemonic: string;
}

export default function Send({ utxos, changeAddresses, mnemonic }: Props) {
  const [step, setStep] = useState(0); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [transaction, setTransaction] = useState<Psbt | undefined>(undefined); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState("");

  const createTransactionWithFormValues = async (
    recipientAddress: string,
    amountToSend: number
  ) => {
    try {
      const currentPSBT = await createTransaction(
        utxos,
        recipientAddress,
        amountToSend,
        changeAddresses[0]
      );

      const signedPSBT = await signTransaction(currentPSBT, mnemonic)

      console.log("Signed PSBT: ", signedPSBT);
      console.log("current PSBT: ", currentPSBT);

      setTransaction(signedPSBT)
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <main className="flex-1">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {step === 0 && (
              <CreateTxForm
                error={error}
                createTransaction={createTransactionWithFormValues}
              />
            )}
            {step === 1 && (
              <TransactionSummary
                transaction={transaction!}
                utxos={utxos}
                broadcastTx={broadcastTx}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
