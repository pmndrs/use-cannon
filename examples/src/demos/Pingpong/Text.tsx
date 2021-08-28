import { FontLoader, TextGeometry } from 'three'
import { forwardRef, useMemo } from 'react'
import fontJson from './resources/firasans_regular.json'

import type { Object3D } from 'three'
import type { GroupProps } from '@react-three/fiber'

const font = new FontLoader().parse(fontJson)
const geom = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(
  (number) => new TextGeometry(number, { font, size: 5, height: 0.1 }),
)

type TextProps = GroupProps & {
  count: string
  color?: string
}

const Text = forwardRef<Object3D, TextProps>(({ color = 'white', count, ...props }, ref) => {
  const array = useMemo(() => [...count], [count])
  return (
    <group ref={ref} {...props} dispose={null}>
      {array.map((char, index) => (
        <mesh
          position={[-(array.length / 2) * 3.5 + index * 3.5, 0, 0]}
          key={index}
          geometry={geom[parseInt(char)]}>
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  )
})

export default Text
