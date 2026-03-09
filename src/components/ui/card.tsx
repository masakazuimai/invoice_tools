type Props = {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = "" }: Props) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  )
}
