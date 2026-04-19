import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { MetricTile, SectionCard, WorkspaceHeader } from "../components/WorkspaceUi";

const storeCards = [
  { code: "acafe-hcm-01", name: "ACAFE Quận 1", dailyOrders: 86, revenue: 15430000, openTickets: 9 },
  { code: "acafe-hcm-02", name: "ACAFE Quận 3", dailyOrders: 63, revenue: 10620000, openTickets: 4 },
  { code: "acafe-hcm-03", name: "ACAFE Phú Nhuận", dailyOrders: 71, revenue: 12480000, openTickets: 7 }
];

export function StoreDashboardPage() {
  const totalRevenue = storeCards.reduce((sum, store) => sum + store.revenue, 0);
  const totalOrders = storeCards.reduce((sum, store) => sum + store.dailyOrders, 0);

  return (
    <div className="page-shell">
      <TopBar />

      <WorkspaceHeader
        eyebrow="Van hanh"
        title="Tong quan cua hang"
        description="Theo doi doanh thu, don hang va tinh trang chi nhanh tren mot bo giao dien chung."
      />

      <section className="stats-grid dashboard-overview-grid store-overview-grid">
        <MetricTile
          label="Doanh thu hom nay"
          value={`${totalRevenue.toLocaleString("vi-VN")} d`}
          helper="Tong doanh thu tat ca chi nhanh"
          trendLabel={`${storeCards.length} diem ban`}
          iconClass="fa-solid fa-wallet"
          tone="accent"
          direction="up"
        />
        <MetricTile
          label="Tong don hang"
          value={totalOrders}
          helper="Tong giao dich trong ngay"
          trendLabel="Van hanh on dinh"
          iconClass="fa-solid fa-receipt"
          tone="success"
          direction="up"
        />
        <MetricTile
          label="So chi nhanh"
          value={storeCards.length}
          helper="Dang ket noi vao he thong"
          trendLabel="Theo doi tap trung"
          iconClass="fa-solid fa-store"
          tone="primary"
          direction="flat"
        />
      </section>

      <SectionCard title="Tong quan chi nhanh" description="Danh sach chi nhanh dang duoc quan ly.">
        <div className="store-grid">
          {storeCards.map((store) => (
            <article className="store-card workspace-store-card" key={store.code}>
              <h4>{store.name}</h4>
              <p>Mã chi nhánh: {store.code}</p>
              <p>Đơn hàng: {store.dailyOrders}</p>
              <p>Phiếu bếp đang mở: {store.openTickets}</p>
              <p>Doanh thu: {store.revenue.toLocaleString("vi-VN")} đ</p>
              <Link className="primary-button inline" to={`/store/${store.code}/sales`}>
                Xem bán hàng
              </Link>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
