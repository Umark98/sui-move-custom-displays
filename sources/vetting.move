// module braav::vetting {
//     use braav::cap::AdminCap;
//     use sui::table::{Self, Table};
    

//     public struct VettingTable has key {
//         id: UID,
//         records: Table<address, bool>,
//     }

//     public entry fun initialize_vetting_table(_cap: &AdminCap, ctx: &mut TxContext) {
//     let mut vetting_table = VettingTable {
//         id: object::new(ctx),
//         records: table::new(ctx),
//     };
//     let admin = tx_context::sender(ctx);
//     table::add(&mut vetting_table.records, admin, true);
//     transfer::share_object(vetting_table);
// }


//     public entry fun submit_for_vetting(table: &mut VettingTable, ctx: &mut TxContext) {
//         let applicant = tx_context::sender(ctx);
//         if (!table::contains(&table.records, applicant)) {
//             table::add(&mut table.records, applicant, false);
//         };
//     }

//     public entry fun approve_vetting(_cap: &AdminCap, table: &mut VettingTable, applicant: address) {
//         assert!(table::contains(&table.records, applicant), 0);
//         let status = table::borrow_mut(&mut table.records, applicant);
//         *status = true;
//     }

//     public fun status_of_vetting(table: &VettingTable, applicant: address): Option<bool> {
//         if (table::contains(&table.records, applicant)) {
//             option::some(*table::borrow(&table.records, applicant))
//         } else {
//             option::none()
//         }
//     }
// }

