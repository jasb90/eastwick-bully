import React from 'react'
import { set } from 'sanity'

export default function TrackWallPosition(props: any) {
  const { value = 50, onChange } = props

  return (
    <div style={{padding:'8px 0'}}>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(set(Number(e.target.value)))}
      />
      <div style={{fontSize:12, opacity:0.6}}>{value}%</div>
    </div>
  )
}