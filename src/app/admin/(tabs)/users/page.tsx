"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserProfile,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "@/lib/users";
import { Timestamp } from "firebase/firestore";

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    displayName: "",
    role: "user" as "admin" | "user",
    notes: "",
  });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetForm = () => {
    setFormData({ email: "", displayName: "", role: "user", notes: "" });
    setEditingUser(null);
    setIsCreating(false);
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      notes: user.notes || "",
    });
    setIsCreating(false);
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.email || !formData.displayName) return;

    setSaving(true);
    try {
      if (editingUser?.id) {
        await updateUser(editingUser.id, {
          displayName: formData.displayName,
          role: formData.role,
          notes: formData.notes,
        });
      } else {
        await createUser({
          email: formData.email,
          displayName: formData.displayName,
          role: formData.role,
          notes: formData.notes,
        });
      }
      await loadUsers();
      resetForm();
    } catch (error) {
      console.error("Error saving user:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: UserProfile) => {
    if (!user.id) return;
    if (!confirm(`Delete user "${user.displayName}"?`)) return;

    try {
      await deleteUser(user.id);
      await loadUsers();
      if (editingUser?.id === user.id) {
        resetForm();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "—";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[--muted]">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen bg-white overflow-hidden flex">
      {/* User List */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-6 border-b border-[--border] flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[--foreground]">Users</h1>
            <p className="text-sm text-[--muted] mt-1">
              {users.length} registered user{users.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-xs text-[--muted] uppercase tracking-wide">
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium">Last Login</th>
                <th className="px-6 py-3 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border]">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50 ${
                    editingUser?.id === user.id ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                        {user.displayName?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="font-medium text-[--foreground]">
                          {user.displayName}
                        </div>
                        <div className="text-sm text-[--muted]">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[--muted]">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-[--muted]">
                    {formatDate(user.lastLogin)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 text-[--muted] hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-1.5 text-[--muted] hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[--muted]">
                    No users yet. Click "Add User" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Panel */}
      {(editingUser || isCreating) && (
        <div className="w-80 border-l border-[--border] bg-gray-50 flex flex-col">
          <div className="p-4 border-b border-[--border] flex items-center justify-between">
            <h2 className="font-medium text-[--foreground]">
              {isCreating ? "New User" : "Edit User"}
            </h2>
            <button
              onClick={resetForm}
              className="p-1 text-[--muted] hover:text-[--foreground]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-[--muted] mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingUser}
                className="w-full px-3 py-2 text-sm border border-[--border] rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-[--muted]"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[--muted] mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[--border] rounded focus:outline-none focus:border-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[--muted] mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "user" })}
                className="w-full px-3 py-2 text-sm border border-[--border] rounded focus:outline-none focus:border-blue-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[--muted] mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[--border] rounded focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
                placeholder="Optional notes about this user..."
              />
            </div>
          </div>

          <div className="p-4 border-t border-[--border]">
            <button
              onClick={handleSave}
              disabled={saving || !formData.email || !formData.displayName}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : isCreating ? "Create User" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
