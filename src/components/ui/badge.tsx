type Props = {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-base font-medium ${className}`}
    >
      {children}
    </span>
  )
}
