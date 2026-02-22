import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function main() {
    await sql`DROP TABLE IF EXISTS "player-progression" CASCADE`;
    console.log('✓ Dropped old "player-progression" table');
    await sql.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
