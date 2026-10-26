import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 배포(M5)를 대비해 상대 경로 base 사용
export default defineConfig({
  plugins: [react()],
  base: './',
})
