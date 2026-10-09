import Link from "next/link";
import { notFound } from "next/navigation";
import { lookupService } from "../../../lib/lookup";
import styles from "../../ui.module.css";
import { LookupView } from "./lookup-view";

export default async function LookupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lookup = await lookupService().get(id);
  if (!lookup) notFound();
  return (
    <main className={styles.shell}>
      <h1 className={styles.heading}>
        <Link href="/">What&rsquo;s that song?</Link>
      </h1>
      <LookupView
        id={lookup.id}
        initial={{
          link: lookup.link.url,
          status: lookup.status,
          matches: lookup.matches,
          platformTag: lookup.platformTag,
          failureReason: lookup.failureReason,
        }}
      />
      <p className={styles.again}>
        <Link href="/">Identify another link</Link>
      </p>
    </main>
  );
}
