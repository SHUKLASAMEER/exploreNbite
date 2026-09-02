"use client";

import { useEffect, useState } from "react";
import { Trash2, Check, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/admin/ui/PageHeader";
import Button from "@/components/admin/ui/Button";
import DataTable from "@/components/admin/ui/DataTable";
import Pagination from "@/components/admin/ui/Pagination";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import EmptyState from "@/components/admin/ui/EmptyState";
import ErrorState from "@/components/admin/ui/ErrorState";
import { useToast } from "@/components/admin/ui/Toast";
import styles from "./MessagesManager.module.css";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TOPIC_LABELS = { contact: "Contact", work_with_me: "Work With Me" };

// Read-only inbox for the Contact / Work With Me enquiry forms. Enquiries
// are created only by the public POST /api/contact endpoint; here an admin
// can read them, mark them handled, and delete them.
export default function MessagesManager() {
  const showToast = useToast();

  const [filter, setFilter] = useState("all"); // all | contact | work_with_me | unhandled
  const [page, setPage] = useState(1);
  const limit = 20;

  const [rows, setRows] = useState(null); // null = loading
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 0 });
  const [listError, setListError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  async function loadMessages() {
    setListError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (filter === "contact" || filter === "work_with_me") params.set("topic", filter);
      if (filter === "unhandled") params.set("handled", "false");

      const res = await apiFetch(`/api/admin/messages?${params.toString()}`);
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setListError(data?.error?.message ?? "Failed to load messages.");
        setRows([]);
        return;
      }
      setRows(data.data ?? []);
      setPagination(data.pagination ?? { page: 1, limit, total: 0, totalPages: 0 });
    } catch {
      setListError("Failed to load messages.");
      setRows([]);
    }
  }

  async function toggleHandled(row) {
    try {
      const res = await apiFetch(`/api/admin/messages/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handled: !row.handled }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        showToast(data?.error?.message ?? "Could not update this message.", { type: "error" });
        return;
      }
      showToast(row.handled ? "Marked as not handled." : "Marked as handled.");
      await loadMessages();
    } catch {
      showToast("Something went wrong.", { type: "error" });
    }
  }

  async function performDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await apiFetch(`/api/admin/messages/${deleteTarget.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setDeleteError(data?.error?.message ?? "Could not delete this message.");
        setDeleteLoading(false);
        return;
      }
      showToast(`Deleted enquiry from "${deleteTarget.name}".`);
      setDeleteTarget(null);
      setDeleteLoading(false);
      await loadMessages();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  const columns = [
    {
      key: "from",
      header: "From",
      render: (m) => (
        <div>
          <div className={styles.name}>{m.name}</div>
          <a href={`mailto:${m.email}`} className={styles.email}>{m.email}</a>
        </div>
      ),
    },
    { key: "topic", header: "Form", render: (m) => TOPIC_LABELS[m.topic] ?? m.topic, width: "10%" },
    {
      key: "status",
      header: "Status",
      width: "10%",
      render: (m) => (
        <span className={`${styles.badge} ${m.handled ? styles.handled : styles.unhandled}`}>
          {m.handled ? "Handled" : "Unhandled"}
        </span>
      ),
    },
    {
      key: "message",
      header: "Message",
      render: (m) => (
        <div className={styles.message}>
          {m.subject ? <div className={styles.subject}>{m.subject}</div> : null}
          <div className={styles.body}>{m.message}</div>
        </div>
      ),
    },
    { key: "createdAt", header: "Received", render: (m) => formatDate(m.createdAt), width: "14%" },
    {
      key: "actions",
      header: "",
      width: "1%",
      render: (m) => (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            icon={m.handled ? RotateCcw : Check}
            onClick={() => toggleHandled(m)}
          >
            {m.handled ? "Reopen" : "Handled"}
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleteTarget(m)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const FILTERS = [
    ["all", "All"],
    ["unhandled", "Unhandled"],
    ["contact", "Contact"],
    ["work_with_me", "Work With Me"],
  ];

  return (
    <div>
      <PageHeader
        title="Messages"
        description={
          rows !== null
            ? `${pagination.total} enquir${pagination.total === 1 ? "y" : "ies"} from the Contact and Work With Me forms.`
            : "Contact and Work With Me enquiries."
        }
      />

      <div className={styles.toolbar}>
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`${styles.filterButton} ${filter === value ? styles.filterActive : ""}`}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {listError ? (
        <ErrorState title="Couldn't load messages" description={listError} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={(m) => m.id}
            loadingLabel="Loading messages…"
            emptyState={<EmptyState title="No enquiries yet" description="Submissions from the Contact and Work With Me forms will appear here." />}
          />
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this enquiry?"
        description={deleteTarget ? `The message from "${deleteTarget.name}" will be permanently deleted.` : ""}
        loading={deleteLoading}
        error={deleteError}
        onConfirm={performDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError("");
        }}
      />
    </div>
  );
}
