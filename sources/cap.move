module braav::cap {


    public struct AdminCap has key, store {
        id: UID
    }

    public struct TransferCap has key {
        id: UID
    }

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap { id: object::new(ctx) };
        transfer::public_transfer(admin_cap, tx_context::sender(ctx));
    }

    public fun burn_admin_cap(admin_cap: AdminCap) {
        let AdminCap { id } = admin_cap;
        object::delete(id)
    }

    public(package) fun new(ctx: &mut TxContext): AdminCap {
        AdminCap { id: object::new(ctx) }
    }

    public fun create_transfer_cap(_: &AdminCap, recipient: address, ctx: &mut TxContext) {
        transfer::transfer(TransferCap { id: object::new(ctx) }, recipient)
    }
}