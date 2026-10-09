import { notFound } from "next/navigation";
import { lookupService } from "../../../lib/lookup";
import styles from "../../page.module.css";
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
    <div className={styles.page}>
      <h1>What song is this?</h1>
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
    </div>
  );
}
