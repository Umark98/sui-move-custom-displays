module braav::packages {
    const VERSION: u16 = 1;
    public struct PACKAGE has drop {}
    public fun version(): u16 { VERSION }
}