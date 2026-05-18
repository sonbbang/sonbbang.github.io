import { useRef, useEffect, useState } from 'react'

interface Restaurant {
  id: string
  name: string
  cuisine?: string
}

interface RouletteWheelProps {
  restaurants: Restaurant[]
  onResult: (restaurant: Restaurant) => void
}

const COLORS = [
  '#FF6B6B', '#FF8E53', '#FFA500', '#FFD700',
  '#98FB98', '#87CEEB', '#DDA0DD', '#F0E68C',
  '#FF69B4', '#20B2AA', '#9370DB', '#FF7F50',
]

export function RouletteWheel({ restaurants, onResult }: RouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const spinAngleRef = useRef(0)
  const animFrameRef = useRef<number>(0)

  const items = restaurants.slice(0, 12)
  const sliceAngle = (2 * Math.PI) / items.length

  function drawWheel(angle: number) {
    const canvas = canvasRef.current
    if (!canvas || items.length === 0) return
    const ctx = canvas.getContext('2d')!
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const radius = cx - 10

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    items.forEach((item, i) => {
      const startAngle = angle + i * sliceAngle
      const endAngle = startAngle + sliceAngle

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = COLORS[i % COLORS.length]
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(startAngle + sliceAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#1a1a1a'
      ctx.font = 'bold 12px sans-serif'
      const label = item.name.length > 10 ? item.name.slice(0, 10) + '…' : item.name
      ctx.fillText(label, radius - 12, 4)
      ctx.restore()
    })

    // Center circle
    ctx.beginPath()
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  useEffect(() => {
    drawWheel(spinAngleRef.current)
  }, [restaurants])

  function spin() {
    if (spinning || items.length === 0) return
    setSpinning(true)

    const targetRotations = 5 + Math.random() * 5
    const extraAngle = Math.random() * 2 * Math.PI
    const totalAngle = targetRotations * 2 * Math.PI + extraAngle
    const duration = 4000
    const start = performance.now()
    const startAngle = spinAngleRef.current

    function animate(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startAngle + totalAngle * eased
      spinAngleRef.current = current
      drawWheel(current)

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        setSpinning(false)
        // Find selected item: the top of wheel is -PI/2
        const finalAngle = ((current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
        // The pointer is at the top (-PI/2 from east = 3PI/2 from 0)
        const pointerAngle = (3 * Math.PI) / 2
        const offset = ((pointerAngle - finalAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
        const index = Math.floor(offset / sliceAngle) % items.length
        onResult(items[index])
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }

  if (items.length === 0) return null

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Pointer */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-2 z-10">
          <div className="w-0 h-0 border-t-[12px] border-b-[12px] border-r-[20px] border-t-transparent border-b-transparent border-r-red-500" />
        </div>
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="rounded-full shadow-2xl cursor-pointer"
          onClick={spin}
        />
      </div>
      <button
        onClick={spin}
        disabled={spinning}
        className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-full text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {spinning ? '돌아가는 중...' : '🎰 룰렛 돌리기'}
      </button>
    </div>
  )
}
