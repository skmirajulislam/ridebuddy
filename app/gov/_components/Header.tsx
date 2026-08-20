"use client";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="gov-header">
      <div>
        <h1 className="gov-header__title">{title}</h1>
        <p className="gov-header__sub">{subtitle}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 6px #22c55e",
          }}
        />
        <span style={{ fontSize: "12px", color: "var(--gov-text-muted)", fontWeight: 500 }}>
          Live Stream Active
        </span>
      </div>
    </header>
  );
}
