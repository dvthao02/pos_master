import { Link, useParams } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { MetricTile, SectionCard, WorkspaceHeader } from "../components/WorkspaceUi";

const topItems = [
  { name: "Americano", quantity: 39, gross: 1365000 },
  { name: "Latte", quantity: 31, gross: 1395000 },
  { name: "Cheese Croissant", quantity: 18, gross: 810000 }
];

export function StoreSalesPage() {
  const { storeCode } = useParams();

  return (
    <div className="page-shell">
      <TopBar />

      <WorkspaceHeader
        eyebrow="Ban hang"
        title={storeCode?.toUpperCase() ?? "Chi nhanh"}
        description="Tong quan hieu suat thu ngan, mon ban chay va doanh thu trong ngay."
        actions={<Link className="ghost-button workspace-header-button" to="/store-dashboard">Quay lai tong quan</Link>}
      />

      <section className="stats-grid dashboard-overview-grid store-overview-grid">
        <MetricTile
          label="Doanh thu thuan"
          value="12.980.000 d"
          helper="Doanh thu trong ngay"
          trendLabel="Tang truong on dinh"
          iconClass="fa-solid fa-sack-dollar"
          tone="accent"
          direction="up"
        />
        <MetricTile
          label="So giao dich"
          value={74}
          helper="Giao dich hoan tat"
          trendLabel="Nhip do ban hang cao"
          iconClass="fa-solid fa-cash-register"
          tone="success"
          direction="up"
        />
        <MetricTile
          label="Gia tri don TB"
          value="175.405 d"
          helper="Gia tri moi giao dich"
          trendLabel="Muc trung binh tot"
          iconClass="fa-solid fa-chart-simple"
          tone="primary"
          direction="flat"
        />
      </section>

      <SectionCard title="Mon ban chay hom nay" description="Nhung san pham dong gop doanh thu tot nhat trong ca.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Món</th>
                <th>Số lượng</th>
                <th>Doanh thu gộp</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.gross.toLocaleString("vi-VN")} đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
