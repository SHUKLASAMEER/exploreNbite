"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Award as AwardIcon, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import DataTable from "@/components/admin/ui/DataTable";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import EmptyState from "@/components/admin/ui/EmptyState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./AwardsManager.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AwardsManager() {
  const router = useRouter();
  const showToast = useToast();

  const [awards, setAwards] = useState(null); // null = loading
  const [listError, setListError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadAwards();
  }, []);

  async function loadAwards() {
    setListError("");
    try {
      const res = await apiFetch("/api/admin/awards");
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setListError(data?.error?.message ?? "Failed to load awards.");
        setAwards([]);
        return;
      }
      setAwards(data.awards ?? []);
    } catch {
      setListError("Failed to load awards.");
      setAwards([]);
    }
  }

  function confirmDelete(award) {
    setDeleteTarget(award);
    setDeleteError("");
  }

  function cancelDelete() {
    setDeleteTarget(null);
    setDeleteError("");
  }

  async function performDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError("");

    try {
      const res = await apiFetch(`/api/admin/awards/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setDeleteError(data?.error?.message ?? "Could not delete this award.");
        setDeleteLoading(false);
        return;
      }

      showToast(`Deleted "${deleteTarget.title}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadAwards();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  const columns = [
    {
      key: "image",
      header: "",
      width: "1%",
      render: (award) =>
        award.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL (often our own /uploads media), not a project asset
          <img
            src={award.imageUrl}
            alt=""
            className={styles.thumb}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className={styles.thumbPlaceholder}>
            <AwardIcon size={16} strokeWidth={2} aria-hidden="true" />
          </div>
        ),
    },
    { key: "title", header: "Title", render: (award) => <span className={styles.titleCell}>{award.title}</span> },
    {
      key: "sourceLink",
      header: "Source Link",
      render: (award) =>
        award.sourceLink ? (
          <a href={award.sourceLink} target="_blank" rel="noreferrer" className={styles.link}>
            <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
            Link
          </a>
        ) : (
          <span className={styles.muted}>—</span>
        ),
    },
    { key: "dateReceived", header: "Date Received", render: (award) => formatDate(award.dateReceived) },
    {
      key: "actions",
      header: "",
      width: "1%",
      render: (award) => (
        <div className={styles.rowActions}>
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => router.push(`/admin/awards/${award.id}/edit`)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => confirmDelete(award)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Awards & Accolades"
        description="Awards and press mentions."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => router.push("/admin/awards/new")}>
            Add Award
          </Button>
        }
      />

      {listError ? (
        <ErrorState title="Couldn't load awards" description={listError} />
      ) : (
        <DataTable
          columns={columns}
          rows={awards}
          getRowKey={(award) => award.id}
          loadingLabel="Loading awards…"
          emptyState={
            <EmptyState
              title="No awards yet"
              action={
                <Button variant="primary" icon={Plus} onClick={() => router.push("/admin/awards/new")}>
                  Add Award
                </Button>
              }
            />
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this award?"
        description={
          deleteTarget ? `"${deleteTarget.title}" will be permanently deleted. This can't be undone.` : ""
        }
        loading={deleteLoading}
        error={deleteError}
        onConfirm={performDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
