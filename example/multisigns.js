const { Client } = require('mixin-node-sdk');
const keystore = require('./keystore.json');
const client = new Client(keystore);
async function main() {
  const me = await client.userMe();
  const members = [me.app.creator_id, me.user_id];
  const threshold = 1;
  const amount = String(1e-4);
  // 1. 发送交易给多签账户
  const sendMultiTx = await client.transaction({
    asset_id: '965e5c6e-434c-3fa9-b780-c50f43cd955c',
    amount,
    trace_id: client.newUUID(),
    memo: 'send to multisig',
    opponent_multisig: {
      threshold,
      receivers: members,
    },
  });
  console.log(sendMultiTx);
  let utxo,
    offset = '';

  // 等待交易完成
  while (true) {
    const outputs = await client.readMultisigOutputs(members, threshold, offset, 10);
    // console.log(outputs);
    for (const { updated_at, transaction_hash } of outputs) {
      offset = updated_at;
      console.log('current hash:', transaction_hash);
      if (transaction_hash === sendMultiTx.transaction_hash) {
        utxo = outputs;
        break;
      }
    }
    if (utxo) {
      console.log('found hash:', transaction_hash);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000 * 5));
    console.log('waiting for utxo', sendMultiTx.transaction_hash);
  }
  // 2. 从多签账户转给开发者
  const transferTx = await client.makeMultisignTransaction({
    memo: 'multisig test',
    inputs: utxo,
    outputs: [
      {
        receivers: [me.app.creator_id],
        threshold: 1,
        amount,
      },
    ],
    hint: client.newUUID(),
  });
  // 构建签名交易
  console.log('transferTx', transferTx);
  const multisig = await client.createMultisig('sign', transferTx);
  // 签名c
  console.log('multisig', multisig);
  const signed = await client.signMultisig(multisig.request_id);
  // 发送签名交易
  console.log('signed.....');
  console.log(signed);
  const txHash = await client.sendRawTransaction(signed.raw_transaction);
  console.log(txHash);
}

main();
