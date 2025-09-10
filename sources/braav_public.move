
module braav::braav_public {

use sui::package;
use braav::counter::{Self, Counter};
use std::string::{Self, String};
use sui::vec_set::{Self, VecSet};
use sui::event;
use sui::clock::{Self, Clock};

const ERROR_SUPPLY_LIMIT_EXCEEDED: u64 = 3;
const ERROR_INVALID_SUPPLY_LIMIT: u64 = 4;
const ERROR_INVALID_ADDRESS: u64 = 5;

public struct BRAAV_PUBLIC has drop {}

public struct CreatorCap has key, store {
    id: UID,
}

public struct RecipientRecord has copy, drop, store {
    recipient: address,
    quantity: u64,
    timestamp: u64, 
}

public struct Lineage has key, store {
    id: UID,
    records: vector<RecipientRecord>,
}

public struct BRAAV<phantom T> has key, store {
    id: UID,
    supply_limit: u64,
    minted_count: u64,
    counter: object::ID,
    lineage: object::ID,
    allowed_transferees: VecSet<address>,
}

public struct NFT<phantom T> has key, store {
    id: UID,
    name: String,
    description: String,
    image_url: String,
    project_url: String,
    coin_story: String,
    coin_id: String,
    mint_number: u64,
    issuer: address,
    timestamp: u64, 
    restricted: bool,
}

public struct RestrictedNFT<phantom T> has key, store {
    id: UID,
    name: String,
    description: String,
    image_url: String,
    project_url: String,
    coin_story: String,
    coin_id: String,
    mint_number: u64,
    issuer: address,
    timestamp: u64, 
    restricted: bool,
}

public struct CounterCreated has copy, drop {
    counter_id: object::ID,
}

fun init(otw: BRAAV_PUBLIC, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);
    let creator_cap = CreatorCap {
        id: object::new(ctx),
    };
    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(creator_cap, ctx.sender());
}

public fun create_supply<T>(
    _creator: &CreatorCap,
    supply_limit: u64,
    ctx: &mut TxContext,
): BRAAV<T> {
    let mut counter = counter::new_internal(ctx);
    let counter_id = counter::get_id(&counter);
    counter::add_field<T>(&mut counter);
    event::emit(CounterCreated { counter_id });
    transfer::public_transfer(counter, ctx.sender());
    let lineage = Lineage {
        id: object::new(ctx),
        records: vector::empty<RecipientRecord>(),
    };
    let lineage_id = object::id(&lineage);
    transfer::share_object(lineage);
    BRAAV<T> {
        id: object::new(ctx),
        supply_limit,
        minted_count: 0,
        counter: counter_id,
        lineage: lineage_id,
        allowed_transferees: vec_set::empty(),
    }
}
public fun mint_and_transfer<T: drop>(
    name: String,
    description: String,
    image_url: String,
    project_url: String,
    coin_story: String,
    coin_id: String,
    supply_cap: &mut BRAAV<T>,
    lineage: &mut Lineage,
    counter: &mut Counter,
    recipient: address,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(recipient != @0x0, ERROR_INVALID_ADDRESS);
    assert!(object::id(lineage) == supply_cap.lineage, ERROR_INVALID_ADDRESS);
    assert!(object::id(counter) == supply_cap.counter, ERROR_INVALID_ADDRESS);
    let minted = counter::num_minted<T>(counter);
    assert!(minted < supply_cap.supply_limit, ERROR_SUPPLY_LIMIT_EXCEEDED);
    counter::incr_counter<T>(counter);
    supply_cap.minted_count = supply_cap.minted_count + 1;
    let timestamp = clock::timestamp_ms(clock); 
    let nft = NFT<T> {
        id: object::new(ctx),
        name,
        description,
        image_url,
        project_url,
        coin_story,
        coin_id,
        mint_number: minted + 1,
        issuer: ctx.sender(),
        timestamp,
        restricted: false,
    };
    vector::push_back(&mut lineage.records, RecipientRecord {
        recipient,
        quantity: 1,
        timestamp,
    });
    transfer::public_transfer(nft, recipient); // Transfer ownership to recipient
}

public fun mint_restricted<T: drop>(
    _creator: &CreatorCap,
    supply_cap: &mut BRAAV<T>,
    lineage: &mut Lineage,
    counter: &mut Counter,
    recipient: address,
    name: String,
    description: String,
    image_url: String,
    project_url: String,
    coin_story: String,
    coin_id: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(recipient != @0x0, ERROR_INVALID_ADDRESS);
    assert!(object::id(lineage) == supply_cap.lineage, ERROR_INVALID_ADDRESS);
    assert!(object::id(counter) == supply_cap.counter, ERROR_INVALID_ADDRESS);
    let minted = counter::num_minted<T>(counter);
    assert!(minted < supply_cap.supply_limit, ERROR_SUPPLY_LIMIT_EXCEEDED);
    counter::incr_counter<T>(counter);
    supply_cap.minted_count = supply_cap.minted_count + 1;
    let timestamp = clock::timestamp_ms(clock); 
    let nft = RestrictedNFT<T> {
        id: object::new(ctx),
        name,
        description,
        image_url,
        project_url,
        coin_story,
        coin_id,
        mint_number: minted + 1,
        issuer: ctx.sender(),
        timestamp,
        restricted: true,
    };
    vector::push_back(&mut lineage.records, RecipientRecord {
        recipient,
        quantity: 1,
        timestamp,
    });
    transfer::transfer(nft, recipient);
}

public fun restricted_transfer<T: drop>(
    _creator: &CreatorCap,
    supply_cap: &mut BRAAV<T>,
    lineage: &mut Lineage,
    nft: RestrictedNFT<T>,
    recipient: address,
    clock: &Clock,
    _ctx: &mut TxContext,
) {
    assert!(recipient != @0x0, ERROR_INVALID_ADDRESS);
    assert!(object::id(lineage) == supply_cap.lineage, ERROR_INVALID_ADDRESS);
    vec_set::insert(&mut supply_cap.allowed_transferees, recipient);
    vector::push_back(&mut lineage.records, RecipientRecord {
        recipient,
        quantity: 1,
        timestamp: clock::timestamp_ms(clock), 
    });
    transfer::transfer(nft, recipient);
}

public fun update_nft<T: drop>(
    _creator: &CreatorCap,
    nft: &mut NFT<T>,
    new_name: String,
    new_description: String,
    new_image_url: String,
    new_project_url: String,
    new_coin_story: String,
    new_coin_id: String,
) {
    nft.name = new_name;
    nft.description = new_description;
    nft.image_url = new_image_url;
    nft.project_url = new_project_url;
    nft.coin_story = new_coin_story;
    nft.coin_id = new_coin_id;
}

public fun update_restricted_nft<T: drop>(
    _creator: &CreatorCap,
    nft: &mut RestrictedNFT<T>,
    new_name: String,
    new_description: String,
    new_image_url: String,
    new_project_url: String,
    new_coin_story: String,
    new_coin_id: String,
) {
    nft.name = new_name;
    nft.description = new_description;
    nft.image_url = new_image_url;
    nft.project_url = new_project_url;
    nft.coin_story = new_coin_story;
    nft.coin_id = new_coin_id;
}

public fun update_supply<T>(
    _creator: &CreatorCap,
    supply_cap: &mut BRAAV<T>,
    new_limit: u64,
    counter: &Counter,
) {
    let minted = counter::num_minted<T>(counter);
    assert!(object::id(counter) == supply_cap.counter, ERROR_INVALID_ADDRESS);
    assert!(new_limit >= minted, ERROR_INVALID_SUPPLY_LIMIT);
    supply_cap.supply_limit = new_limit;
}

public fun get_minted_count<T>(counter: &Counter): u64 {
    counter::num_minted<T>(counter)
}

public fun get_lineage(lineage: &Lineage): vector<RecipientRecord> {
    lineage.records
}

public fun get_counter_id<T>(supply_cap: &BRAAV<T>): object::ID {
    supply_cap.counter
}
}


