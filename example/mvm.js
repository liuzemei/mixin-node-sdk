const { Client, getContractByAssetID, getAssetIDByAddress, getContractByUserIDs, getUserIDByAddress } = require('mixin-node-sdk');
const fs = require('fs');
const keystore = JSON.parse(fs.readFileSync(__dirname + '/../config.json', 'utf8'));
const client = new Client(keystore);

async function main() {
  // get tx
  const tx = await client.paymentGeneratorByContract({
    contracts: [
      {
        address: '0x2E8f70631208A2EcFC6FA47Baf3Fde649963baC7',
        method: 'addAny',
        types: ['uint256'],
        values: ['10'],
      },
    ],
    payment: {
      type: 'tx',
    },
  });
  const res = await client.transaction(tx);
  console.log(res);

  // get payment

  const payment = await client.paymentGeneratorByContract({
    contracts: [
      {
        address: '0x2E8f70631208A2EcFC6FA47Baf3Fde649963baC7',
        method: 'addAny',
        types: ['uint256'],
        values: ['10'],
      },
    ],
  });
  console.log(`mixin://codes/${payment.code_id}`);

  const BtcAssetID = 'c6d0c728-2624-429b-8e0d-d9d19b6592fa';
  const btcAddress = await getContractByAssetID(BtcAssetID);
  console.log('mvm asset_id -> address...', btcAddress);
  const btcAssetID = await getAssetIDByAddress(btcAddress);
  console.log('mvm address -> asset_id...', btcAssetID);
  const UID = 'e8e8cd79-cd40-4796-8c54-3a13cfe50115';
  const userContract = await getContractByUserIDs(UID);
  console.log('mvm user_id -> address', userContract);
  const uID = await getUserIDByAddress(userContract);
  console.log('mvm address -> user_id', uID);
}

main();
