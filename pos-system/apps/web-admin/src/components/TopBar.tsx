import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuthStore } from "../store/authStore";

type TopBarMenuItem = {
  key: string;
  label: string;
  iconClass: string;
  onClick: () => void;
  danger?: boolean;
  value?: ReactNode;
};

type TopBarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
  showBrand?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  pageTitle?: string;
  pageEyebrow?: string;
  leading?: ReactNode;
  headerActions?: ReactNode;
  userMenuItems?: TopBarMenuItem[];
};

function formatRoleLabel(role?: string): string {
  if (!role) {
    return "";
  }
  return role
    .toLowerCase()
    .split("_")
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : ""))
    .join(" ");
}

export function TopBar({
  searchValue,
  onSearchChange,
  notificationCount = 0,
  onNotificationClick,
  showBrand = true,
  showSearch = true,
  searchPlaceholder = "Tìm kiếm...",
  pageTitle,
  pageEyebrow,
  leading,
  headerActions,
  userMenuItems
}: TopBarProps) {
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchText = searchValue ?? localSearch;
  const handleSearchChange = onSearchChange ?? setLocalSearch;
  const primaryRole = formatRoleLabel(session?.roles?.[0]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current) {
        return;
      }
      if (event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function toggleMenu() {
    setMenuOpen((current) => !current);
  }

  function handleOpenNotifications() {
    onNotificationClick?.();
    setMenuOpen(false);
  }

  function handleOpenWorkspace() {
    navigate(session?.loginZone === "platform" ? "/crm-admin" : "/store-dashboard");
    setMenuOpen(false);
  }

  function handleLogout() {
    setMenuOpen(false);
    clearSession();
    navigate(session?.loginZone === "platform" ? "/admin.login" : "/login", { replace: true });
  }

  const resolvedMenuItems: TopBarMenuItem[] = userMenuItems ?? [
    {
      key: "workspace",
      label: session?.loginZone === "platform" ? "Bảng điều khiển quản trị" : "Bảng điều khiển cửa hàng",
      iconClass: "fa-solid fa-gauge-high",
      onClick: handleOpenWorkspace
    },
    ...(onNotificationClick
      ? [
          {
            key: "notifications",
            label: "Thông báo",
            iconClass: "fa-solid fa-bell",
            onClick: handleOpenNotifications,
            value: <span className="user-menu-item-value">{notificationCount}</span>
          } satisfies TopBarMenuItem
        ]
      : []),
    {
      key: "logout",
      label: "Đăng xuất",
      iconClass: "fa-solid fa-right-from-bracket",
      onClick: handleLogout,
      danger: true
    }
  ];

  return (
    <header className={`topbar${showBrand ? "" : " topbar-no-brand"}${showSearch ? "" : " topbar-no-search"}${leading ? " topbar-with-leading" : ""}`}>
      {leading ? <div className="topbar-leading">{leading}</div> : null}
      {showBrand ? (
        <div className="topbar-brand">
          <p className="topbar-eyebrow">{pageEyebrow ?? "iOrder Quản trị"}</p>
          <h1 className="topbar-title">{pageTitle ?? (session?.loginZone === "platform" ? "CRM Quản trị hệ thống" : "Tổng quan cửa hàng")}</h1>
        </div>
      ) : null}
      {showSearch ? (
        <label className="topbar-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input value={searchText} onChange={(event) => handleSearchChange(event.target.value)} placeholder={searchPlaceholder} />
        </label>
      ) : null}
      <div className="topbar-actions">
        {headerActions}
        <div className="user-menu" ref={menuRef}>
          <button className="identity-pill identity-button" type="button" onClick={toggleMenu} aria-label="Mở menu người dùng" aria-expanded={menuOpen} aria-haspopup="menu">
            <span className="identity-copy">
              <strong>{session?.fullName ?? "Tài khoản"}</strong>
              <span>{primaryRole ? `${primaryRole} · ${session?.username ?? "-"}` : session?.username ?? "-"}</span>
            </span>
            <i className={`fa-solid ${menuOpen ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
            {notificationCount > 0 ? <span className="topbar-badge user-menu-badge">{notificationCount}</span> : null}
          </button>

          {menuOpen ? (
            <div className="user-menu-panel" role="menu" aria-label="Menu người dùng">
              {resolvedMenuItems.map((item) => (
                <button
                  key={item.key}
                  className={`user-menu-item${item.danger ? " danger" : ""}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    item.onClick();
                    setMenuOpen(false);
                  }}
                >
                  <i className={item.iconClass} aria-hidden="true" />
                  {item.label}
                  {item.value}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
