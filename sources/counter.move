module braav::counter {
    use sui::dynamic_field::{Self};
    use braav::packages;

    public struct AssetKey<phantom T> has copy, store, drop {}

    public struct Counter has key, store {
        id: UID,
        version: u16,
    }

    public(package) fun new_internal(ctx: &mut TxContext): Counter {
        Counter {
            id: object::new(ctx),
            version: packages::version(),
        }
    }

    public fun version(self: &Counter): u16 {
        self.version
    }

    public(package) fun add_field<T>(counter: &mut Counter) {
        dynamic_field::add<AssetKey<T>, u64>(&mut counter.id, AssetKey<T> {}, 0)
    }

    public(package) fun incr_counter<T>(counter: &mut Counter) {
        let counter = dynamic_field::borrow_mut<AssetKey<T>, u64>(&mut counter.id, AssetKey<T> {});
        *counter = *counter + 1;
    }

    public fun num_minted<T>(counter: &Counter): u64 {
        *dynamic_field::borrow(&counter.id, AssetKey<T> {})
    }

    public(package) fun add_existing_assets<T>(counter: &mut Counter, minted: u64) {
        add_field<T>(counter);
        let counter = dynamic_field::borrow_mut<AssetKey<T>, u64>(&mut counter.id, AssetKey<T> {});
        *counter = minted
    }

    
public fun get_id(counter: &Counter): object::ID {
   object::uid_to_inner(&counter.id)
}
}
