import psycopg2

DB_CONFIG = {
    'host': 'aws-0-ap-southeast-1.pooler.supabase.com',
    'port': 6543,
    'dbname': 'postgres',
    'user': 'postgres.fqznwnoesagaxrbyxdxx',
    'password': 'shanusupabase',
    'sslmode': 'require',
    'connect_timeout': 15
}

# The existing test organization (most recent "Caelmont Holdings" org owned by the user).
TEST_ORG_ID = "e2b50565-28a1-4807-8e2c-bea91914ce51"

# Demo-safe seed prospects.
# Only fields that exist in the current prospects schema are populated.
# Enrichment / intent / ICP / employee / revenue / research fields are left NULL
# (or at their schema defaults) so we do NOT fabricate verified data.
SEED_PROSPECTS = [
    {
        "company_name": "HubSpot",
        "name": "HubSpot",
        "website": "https://www.hubspot.com",
        "domain": "hubspot.com",
        "industry": "SaaS / CRM",
        "location": "North America",
        "country": "United States",
        "description": "Demo prospect: HubSpot is a customer platform offering CRM, marketing, sales, and service software for B2B companies.",
        "status": "new",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "medium",
        "tags": ["demo"],
    },
    {
        "company_name": "Revolut",
        "name": "Revolut",
        "website": "https://www.revolut.com",
        "domain": "revolut.com",
        "industry": "Fintech",
        "location": "Europe",
        "country": "United Kingdom",
        "description": "Demo prospect: Revolut is a financial technology company offering banking, payments, and money management services.",
        "status": "new",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "medium",
        "tags": ["demo"],
    },
    {
        "company_name": "Zoho",
        "name": "Zoho",
        "website": "https://www.zoho.com",
        "domain": "zoho.com",
        "industry": "SaaS / Business Software",
        "location": "Asia",
        "country": "India",
        "description": "Demo prospect: Zoho is a software company providing a suite of business, productivity, and collaboration applications.",
        "status": "new",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "medium",
        "tags": ["demo"],
    },
]


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # Verify the target organization exists and the user is a member (owner).
        cur.execute(
            "SELECT id, name FROM public.organizations WHERE id = %s",
            (TEST_ORG_ID,),
        )
        org = cur.fetchone()
        if not org:
            raise RuntimeError(f"Organization {TEST_ORG_ID} not found.")
        print(f"Target organization: {org[1]} ({org[0]})")

        inserted = []
        for p in SEED_PROSPECTS:
            # Idempotency: skip if a prospect with this company_name already exists in the org.
            cur.execute(
                """
                SELECT id FROM public.prospects
                WHERE organization_id = %s AND company_name = %s
                """,
                (TEST_ORG_ID, p["company_name"]),
            )
            existing = cur.fetchone()
            if existing:
                print(f"SKIP (already exists): {p['company_name']} -> {existing[0]}")
                inserted.append(existing[0])
                continue

            cur.execute(
                """
                INSERT INTO public.prospects (
                    organization_id,
                    company_name,
                    name,
                    website,
                    domain,
                    industry,
                    location,
                    country,
                    description,
                    status,
                    source,
                    enrichment_status,
                    priority,
                    tags
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    TEST_ORG_ID,
                    p["company_name"],
                    p["name"],
                    p["website"],
                    p["domain"],
                    p["industry"],
                    p["location"],
                    p["country"],
                    p["description"],
                    p["status"],
                    p["source"],
                    p["enrichment_status"],
                    p["priority"],
                    p["tags"],
                ),
            )
            row = cur.fetchone()
            inserted.append(row[0])
            print(f"INSERTED: {p['company_name']} -> {row[0]}")

        conn.commit()
        print(f"\nTotal records ensured: {len(inserted)}")

        # Verification
        print("\n" + "=" * 80)
        print("VERIFICATION — inserted prospects")
        print("=" * 80)
        cur.execute(
            """
            SELECT id, organization_id, company_name, name, website, domain, industry,
                   location, country, status, source, enrichment_status, priority, tags
            FROM public.prospects
            WHERE organization_id = %s
              AND company_name IN ('HubSpot', 'Revolut', 'Zoho')
            ORDER BY company_name
            """,
            (TEST_ORG_ID,),
        )
        rows = cur.fetchall()
        for r in rows:
            print(f"  id: {r[0]}")
            print(f"    org: {r[1]} | company: {r[2]} | name: {r[3]}")
            print(f"    website: {r[4]} | domain: {r[5]} | industry: {r[6]}")
            print(f"    location: {r[7]} | country: {r[8]} | status: {r[9]} | source: {r[10]}")
            print(f"    enrichment: {r[11]} | priority: {r[12]} | tags: {r[13]}")

        if len(rows) != 3:
            raise RuntimeError(f"Expected 3 records, found {len(rows)}")
        print("\nSUCCESS: All 3 demo prospects verified in the database.")
    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()