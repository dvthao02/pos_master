import { Link } from "react-router-dom";

export function ForbiddenPage() {
  return (
    <main className="forbidden-page">
      <div className="forbidden-card">
        <p className="hero-kicker">Không đủ quyền truy cập</p>
        <h2>Tài khoản hiện tại không thể mở trang này.</h2>
        <p>Hãy đăng nhập đúng cổng làm việc dành cho quản trị hệ thống hoặc cho cửa hàng.</p>
        <Link className="primary-button inline" to="/login">
          Quay lại đăng nhập
        </Link>
      </div>
    </main>
  );
}
