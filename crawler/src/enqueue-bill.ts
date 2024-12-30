// import { inngest } from './ingest';
// import BILLS from '../data/bills-5500.json';

// async function main() {
//   // This sends an event to Inngest.
//   const a = await inngest.send(
//     BILLS.bills.map(bill => ({
//       name: 'bill.imported',
//       id: `${bill.congress}-${bill.originChamberCode.toLowerCase()}-${bill.number}`,
//       data: bill,
//     })),
//   );

//   console.log(a);
// }

// main().catch(console.error);
