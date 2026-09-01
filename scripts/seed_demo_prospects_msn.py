import psycopg2

DB_CONFIG = {
    'host': 'aws-0-ap-southeast-1.pooler.supabase.com',
    'port': 6543,
    'dbname': 'postgres',
    'user': 'postgres.fqznwnoesagaxrbyxdxx',
    'password': __import__('os').environ.get('SUPABASE_DB_PASSWORD', ''),
    'sslmode': 'require',
    'connect_timeout': 15
}

# The active test organization (Caelmont Holdings owned by Abdul Ahad).
TEST_ORG_ID = "31bd1981-49b3-4506-800d-356b7f883583"
# The authenticated user (Abdul Ahad) who owns the org — records are scoped to this owner.
TEST_USER_ID = "039edcd9-00c2-4143-b16d-69b97671f75c"

# Demo-safe seed prospects.
# Only fields that exist in the current prospects schema are populated.
# Enrichment / intent / ICP / employee / revenue / research fields are left NULL
# (or at their schema defaults) so we do NOT fabricate verified data.
# No personal contact information is invented — contact fields are left NULL.
# Company names are real, well-known companies from a mix of industries.
SEED_PROSPECTS = [
    {
        "company_name": "Microsoft",
        "name": "Microsoft",
        "website": "https://www.microsoft.com",
        "domain": "microsoft.com",
        "industry": "Software",
        "location": "North America",
        "country": "United States",
        "city": "Redmond",
        "description": "Microsoft is a multinational technology company known for its Windows operating system, Office productivity suite, Azure cloud platform, and other enterprise software.",
        "status": "new",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "high",
        "tags": ["enterprise", "cloud", "saas"],
    },
    {
        "company_name": "Google",
        "name": "Google",
        "website": "https://www.google.com",
        "domain": "google.com",
        "industry": "Software",
        "location": "North America",
        "country": "United States",
        "city": "Mountain View",
        "description": "Google is a technology company specializing in internet-related services and products, including search, cloud computing, advertising, and the Android operating system.",
        "status": "contacted",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "high",
        "tags": ["enterprise", "cloud", "advertising"],
    },
    {
        "company_name": "Amazon",
        "name": "Amazon",
        "website": "https://www.amazon.com",
        "domain": "amazon.com",
        "industry": "E-commerce",
        "location": "North America",
        "country": "United States",
        "city": "Seattle",
        "description": "Amazon is a multinational technology company focused on e-commerce, cloud computing, digital streaming, and artificial intelligence through its AWS platform and retail marketplace.",
        "status": "qualified",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "high",
        "tags": ["ecommerce", "cloud", "retail"],
    },
    {
        "company_name": "Apple",
        "name": "Apple",
        "website": "https://www.apple.com",
        "domain": "apple.com",
        "industry": "Consumer Electronics",
        "location": "North America",
        "country": "United States",
        "city": "Cupertino",
        "description": "Apple designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories, along with software and services.",
        "status": "new",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "medium",
        "tags": ["hardware", "consumer", "services"],
    },
    {
        "company_name": "Salesforce",
        "name": "Salesforce",
        "website": "https://www.salesforce.com",
        "domain": "salesforce.com",
        "industry": "SaaS / CRM",
        "location": "North America",
        "country": "United States",
        "city": "San Francisco",
        "description": "Salesforce is a cloud-based software company that provides customer relationship management (CRM) solutions and enterprise applications for sales, service, and marketing.",
        "status": "proposal_sent",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "high",
        "tags": ["crm", "saas", "enterprise"],
    },
    {
        "company_name": "HubSpot",
        "name": "HubSpot",
        "website": "https://www.hubspot.com",
        "domain": "hubspot.com",
        "industry": "SaaS / CRM",
        "location": "North America",
        "country": "United States",
        "city": "Cambridge",
        "description": "HubSpot is a customer platform offering CRM, marketing, sales, and service software for B2B companies.",
        "status": "contacted",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "medium",
        "tags": ["crm", "marketing", "saas"],
    },
    {
        "company_name": "Shopify",
        "name": "Shopify",
        "website": "https://www.shopify.com",
        "domain": "shopify.com",
        "industry": "E-commerce",
        "location": "North America",
        "country": "Canada",
        "city": "Ottawa",
        "description": "Shopify is a commerce platform that allows businesses to set up online stores, manage inventory, process payments, and sell across multiple channels.",
        "status": "new",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "medium",
        "tags": ["ecommerce", "retail", "saas"],
    },
    {
        "company_name": "Adobe",
        "name": "Adobe",
        "website": "https://www.adobe.com",
        "domain": "adobe.com",
        "industry": "Software",
        "location": "North America",
        "country": "United States",
        "city": "San Jose",
        "description": "Adobe is a software company known for its creative, document, and marketing software products including Photoshop, Illustrator, Acrobat, and Experience Cloud.",
        "status": "qualified",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "medium",
        "tags": ["creative", "marketing", "saas"],
    },
    {
        "company_name": "Atlassian",
        "name": "Atlassian",
        "website": "https://www.atlassian.com",
        "domain": "atlassian.com",
        "industry": "Software",
        "location": "Oceania",
        "country": "Australia",
        "city": "Sydney",
        "description": "Atlassian is a software company that develops products for software developers, project managers, and content management, including Jira, Confluence, and Trello.",
        "status": "new",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "low",
        "tags": ["developer-tools", "collaboration", "saas"],
    },
    {
        "company_name": "Stripe",
        "name": "Stripe",
        "website": "https://www.stripe.com",
        "domain": "stripe.com",
        "industry": "Fintech",
        "location": "North America",
        "country": "United States",
        "city": "San Francisco",
        "description": "Stripe is a financial technology company that provides payment processing software and APIs for internet businesses.",
        "status": "negotiation",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "high",
        "tags": ["fintech", "payments", "api"],
    },
    {
        "company_name": "Notion",
        "name": "Notion",
        "website": "https://www.notion.so",
        "domain": "notion.so",
        "industry": "Productivity Software",
        "location": "North America",
        "country": "United States",
        "city": "San Francisco",
        "description": "Notion is a productivity and collaboration platform that combines notes, documents, wikis, project management, and databases in a single workspace.",
        "status": "contacted",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "low",
        "tags": ["productivity", "collaboration", "saas"],
    },
    {
        "company_name": "Slack",
        "name": "Slack",
        "website": "https://www.slack.com",
        "domain": "slack.com",
        "industry": "Software",
        "location": "North America",
        "country": "United States",
        "city": "San Francisco",
        "description": "Slack is a business communication platform that offers messaging, channels, file sharing, and integrations for teams and organizations.",
        "status": "won",
        "source": "manual",
        "enrichment_status": "pending",
        "priority": "medium",
        "tags": ["communication", "collaboration", "saas"],
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

        # Verify the user is a member of the org (RLS INSERT requires membership).
        cur.execute(
            """
            SELECT EXISTS (
                SELECT 1 FROM public.organization_members
                WHERE organization_id = %s AND user_id = %s
            ) AS is_member
            """,
            (TEST_ORG_ID, TEST_USER_ID),
        )
        is_member = cur.fetchone()[0]
        if not is_member:
            raise RuntimeError(f"User {TEST_USER_ID} is not a member of org {TEST_ORG_ID} — RLS would block inserts.")
        print(f"User {TEST_USER_ID} is a member of the org (RLS insert allowed).")

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
                    city,
                    description,
                    status,
                    source,
                    enrichment_status,
                    priority,
                    tags,
                    owner_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                    p["city"],
                    p["description"],
                    p["status"],
                    p["source"],
                    p["enrichment_status"],
                    p["priority"],
                    p["tags"],
                    TEST_USER_ID,
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
        company_names = [p["company_name"] for p in SEED_PROSPECTS]
        placeholders = ", ".join(["%s"] * len(company_names))
        cur.execute(
            f"""
            SELECT id, organization_id, company_name, name, website, domain, industry,
                   location, country, city, status, source, enrichment_status, priority, tags, owner_id
            FROM public.prospects
            WHERE organization_id = %s
              AND company_name IN ({placeholders})
            ORDER BY company_name
            """,
            [TEST_ORG_ID] + company_names,
        )
        rows = cur.fetchall()
        for r in rows:
            print(f"  id: {r[0]}")
            print(f"    org: {r[1]} | company: {r[2]} | name: {r[3]}")
            print(f"    website: {r[4]} | domain: {r[5]} | industry: {r[6]}")
            print(f"    location: {r[7]} | country: {r[8]} | city: {r[9]}")
            print(f"    status: {r[10]} | source: {r[11]} | enrichment: {r[12]}")
            print(f"    priority: {r[13]} | tags: {r[14]} | owner: {r[15]}")

        if len(rows) != 12:
            raise RuntimeError(f"Expected 12 records, found {len(rows)}")

        # Verify no duplicates
        cur.execute(
            f"""
            SELECT company_name, COUNT(*)
            FROM public.prospects
            WHERE organization_id = %s
              AND company_name IN ({placeholders})
            GROUP BY company_name
            HAVING COUNT(*) > 1
            """,
            [TEST_ORG_ID] + company_names,
        )
        dupes = cur.fetchall()
        if dupes:
            raise RuntimeError(f"Duplicate prospects found: {dupes}")

        print("\nSUCCESS: All 12 demo prospects verified in the database with no duplicates.")
    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()