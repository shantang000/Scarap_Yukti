import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Users } from "lucide-react";

export function useClickOutside(ref, handler, active = true, onEscape = null) {
  useEffect(() => {
    if (!active) return;
    const clickListener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    const keyListener = (event) => {
      if (event.key === "Escape" || event.keyCode === 27) {
        if (onEscape) {
          onEscape(event);
        } else {
          handler(event);
        }
      }
    };
    document.addEventListener("mousedown", clickListener);
    document.addEventListener("touchstart", clickListener);
    document.addEventListener("keydown", keyListener);
    window.addEventListener("keydown", keyListener);
    return () => {
      document.removeEventListener("mousedown", clickListener);
      document.removeEventListener("touchstart", clickListener);
      document.removeEventListener("keydown", keyListener);
      window.removeEventListener("keydown", keyListener);
    };
  }, [ref, handler, active, onEscape]);
}

export function ProfileMenuDropdown({ profile, authSession, role, signOut, authBusy }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const handleEscape = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useClickOutside(menuRef, () => setOpen(false), open, handleEscape);

  const toggle = () => setOpen((prev) => !prev);

  const handleSignOut = () => {
    setOpen(false);
    signOut();
  };

  const displayName = profile?.display_name || authSession?.user?.email || "User";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="profile-menu-container" ref={menuRef} style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        className="profile-menu-trigger"
        onClick={toggle}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="profile-menu-panel"
        aria-label="User account menu"
      >
        <span className="profile-avatar">{initial}</span>
        <span className="profile-menu-copy">
          <strong>{displayName}</strong>
          <small>{role} account</small>
        </span>
        <ChevronDown size={15} className={`dropdown-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div
          id="profile-menu-panel"
          className="profile-menu-panel custom-dropdown-open"
          role="menu"
          aria-label="User account actions"
        >
          <strong>{displayName}</strong>
          <span>{authSession?.user?.email}</span>
          <span className="auth-role-pill">Account type: {role}</span>
          <button
            type="button"
            className="btn btn-light btn-small"
            onClick={handleSignOut}
            disabled={authBusy}
            role="menuitem"
          >
            <LogOut size={13} style={{ marginRight: 6 }} />
            {authBusy ? "Signing out..." : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

export function RoleSwitcherDropdown({ currentRole, onSelectRole }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  const roles = [
    { id: "Seller", desc: "List e-waste & review buyer offers" },
    { id: "Collector", desc: "Claim pickups & bundle consignments" },
    { id: "Recycler", desc: "Submit bids & record intake weight" },
    { id: "Admin", desc: "Review disputes & custody records" }
  ];

  const handleEscape = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useClickOutside(containerRef, () => setOpen(false), open, handleEscape);

  const handleSelect = (roleId) => {
    setOpen(false);
    onSelectRole(roleId);
    triggerRef.current?.focus();
  };

  // When listbox opens, focus currently selected option
  useEffect(() => {
    if (open) {
      const selectedIndex = roles.findIndex((r) => r.id === currentRole);
      const targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
      optionRefs.current[targetIndex]?.focus();
    }
  }, [open, currentRole]);

  const handleOptionKeyDown = (e, index) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (index + 1) % roles.length;
      optionRefs.current[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (index - 1 + roles.length) % roles.length;
      optionRefs.current[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      optionRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      optionRefs.current[roles.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect(roles[index].id);
    }
  };

  return (
    <div className="role-dropdown-container" ref={containerRef} style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        className="role-dropdown-trigger"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="role-switcher-listbox"
        aria-label={`Demo Role: ${currentRole}. Click to change demo role.`}
      >
        <Users size={16} />
        <span className="role-trigger-label">
          <strong>{currentRole}</strong> Demo
        </span>
        <ChevronDown size={14} className={`dropdown-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <ul
          id="role-switcher-listbox"
          className="role-dropdown-listbox"
          role="listbox"
          aria-label="Choose demo role"
        >
          {roles.map((r, index) => {
            const isSelected = r.id === currentRole;
            return (
              <li
                key={r.id}
                ref={(el) => (optionRefs.current[index] = el)}
                id={`role-option-${r.id.toLowerCase()}`}
                role="option"
                aria-selected={isSelected}
                className={`role-option-item ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelect(r.id)}
                onKeyDown={(e) => handleOptionKeyDown(e, index)}
                tabIndex={0}
              >
                <div className="role-option-title">
                  <strong>{r.id}</strong>
                  {isSelected && <span className="role-active-check">Active</span>}
                </div>
                <small className="role-option-desc">{r.desc}</small>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
