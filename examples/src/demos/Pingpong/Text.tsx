import type { GroupProps } from '@react-three/fiber'
import { forwardRef, useMemo } from 'react'
import type { Object3D } from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader'

import fontJson from './resources/firasans_regular.json'

const font = new FontLoader().parse(fontJson)
const geom = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(
  (number) => new TextGeometry(number, { font, height: 0.1, size: 5 }),
)

type TextProps = GroupProps & {
  color?: string
  count: string
}

const Text = forwardRef<Object3D, TextProps>(({ color = 'white', count, ...props }, ref) => {
  const array = useMemo(() => [...count], [count])
  return (
    <group ref={ref} {...props} dispose={null}>
      {array.map((char, index) => (
        <mesh
          position={[-(array.length / 2) * 3.5 + index * 3.5, 0, 0]}
          key={index}
          geometry={geom[parseInt(char)]}
        >
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  )
})

export default Text
