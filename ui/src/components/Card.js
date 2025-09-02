// src/components/Card.js

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white shadow-md rounded-2xl p-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = "" }) {
  return <div className={`border-b pb-2 mb-2 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = "" }) {
  return <h2 className={`text-lg font-bold text-green-700 ${className}`}>{children}</h2>
}

export function CardContent({ children, className = "" }) {
  return <div className={`text-gray-700 ${className}`}>{children}</div>
}
