import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import viteTsconfigPaths from 'vite-tsconfig-paths'
import {resolve} from "path";

export default ({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return defineConfig({
        // depending on your application, base can also be "/"
        base: ``,
        define: {
            'process.env': env,
        },
        resolve: {
            alias: {
                'querystring': './node_modules/querystring-browser/querystring.js',
                'ws': resolve(__dirname, 'src/alias/ws.js')
            },
        },
        css: {
            preprocessorOptions: {
                less: {
                    math: "always",
                    relativeUrls: true,
                    javascriptEnabled: true,
                },
            },
        },
        plugins: [react(), viteTsconfigPaths()],
        server: {
            // this ensures that the browser opens upon server start
            open: true,
            host: true,
            // this sets a default port to 3000
            port: 3000,
        },
    })
}