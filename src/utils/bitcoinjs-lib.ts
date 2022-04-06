import { BIP32Interface } from "bip32";
import { payments, Psbt } from "bitcoinjs-lib";

import { Address, DecoratedUtxo } from "src/types";

import { generateMnemonic, mnemonicToSeed } from "bip39"

import { fromSeed, fromBase58 } from 'bip32';
import { networks } from 'bitcoinjs-lib';

import coinselect from "coinselect";

export const getNewMnemonic = (): string => {
  const mnemonic = generateMnemonic(256);
  return mnemonic;
};

export const getMasterPrivateKey = async (
  mnemonic: string
): Promise<BIP32Interface> => {
  const seed = await mnemonicToSeed(mnemonic);
  const privateKey = fromSeed(seed, networks.bitcoin);

  return privateKey;
};

export const getXpubFromPrivateKey = (
  privateKey: BIP32Interface,
  derivationPath: string
): string => {
  const child = privateKey.derivePath(derivationPath).neutered();
  const xpub = child.toBase58();
  return xpub;
};

export const deriveChildPublicKey = (
  xpub: string,
  derivationPath: string
): BIP32Interface => {
  const node = fromBase58(xpub, networks.bitcoin);
  const child = node.derivePath(derivationPath);
  return child;
};

export const getAddressFromChildPubkey = (
  child: BIP32Interface
): payments.Payment => {

  const address = payments.p2wpkh({
    pubkey: child.publicKey,
    network: networks.bitcoin,
  });

  return address;
};

export const createTransaction = async (
  utxos: DecoratedUtxo[],
  recipientAddress: string,
  amountInSatoshis: number,
  changeAddress: Address
): Promise<Psbt> => {
  // const feeRate = await getFeeRates();

  const { inputs, outputs, fee } = coinselect(
    utxos,
    [
      {
        address: recipientAddress,
        value: amountInSatoshis,
      },
    ],
    1 // feeRate
  );

  if (!inputs || !outputs) throw new Error("Unable to construct transaction");
  if (fee > amountInSatoshis) throw new Error("Fee is too high!");

  const psbt = new Psbt({ network: networks.bitcoin });
  psbt.setVersion(2); // These are defaults. This line is not needed.
  psbt.setLocktime(0); // These are defaults. This line is not needed.

  inputs.forEach((input) => {
    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      sequence: 0xfffffffd, // enables RBF
      witnessUtxo: {
        value: input.value,
        script: input.address.output!,
      },
      bip32Derivation: input.bip32Derivation,
    });
  });

  outputs.forEach((output) => {
    // coinselect doesnt apply address to change output, so add it here
    if (!output.address) {
      output.address = changeAddress.address!;
    }

    psbt.addOutput({
      address: output.address,
      value: output.value,
    });
  });

  return psbt;
};

export const signTransaction = async (
  psbt: any,
  mnemonic: string
): Promise<Psbt> => {
  const seed = await mnemonicToSeed(mnemonic);
  const root = fromSeed(seed, networks.bitcoin);

  psbt.signAllInputsHD(root);
  psbt.finalizeAllInputs();
  return psbt;
};
