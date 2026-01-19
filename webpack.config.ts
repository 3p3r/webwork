import rc from 'rc';
import path from 'path';
import { readFileSync } from 'fs';
import webpack from 'webpack';
import type { Configuration } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';

import 'webpack-dev-server';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const buildConfig = rc('webworkBuild', {
  openwork: {
    root: path.resolve(__dirname, 'openwork'),
  },
  deepagents: {
    root: path.resolve(__dirname, 'deepagents'),
  },
});

const config: Configuration = {
  mode: 'development',
  target: 'web',
  bail: true,
  node: {
    global: true,
  },
  performance: {
    hints: false,
  },
  entry: {
    init: path.join(__dirname, 'src/launchpad.ts'),
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true,
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /busybox\/busybox\.js$/,
        use: [
          {
            loader: 'string-replace-loader',
            options: {
              multiple: [
                {
                  search: 'busybox_unstripped',
                  replace: 'busybox',
                  flags: 'g',
                },
              ],
            },
          },
        ],
      },
      {
        test: /\.[jt]sx?$/,
        exclude: [
          /node_modules\/langchain\/dist\/chat_models\/universal\.js/,
          /busybox\/busybox\.js$/,
        ],
        loader: 'esbuild-loader',
        options: {
          target: 'es2024',
          tsconfigRaw: {
            compilerOptions: {
              jsx: 'react-jsx',
              baseUrl: buildConfig.openwork.root,
              paths: {
                '@/*': ['src/renderer/src/*'],
                '@renderer/*': ['src/renderer/src/*'],
              },
            },
          },
        },
      },
      {
        test: /node_modules\/langchain\/dist\/chat_models\/universal\.js/,
        use: [
          {
            loader: 'string-replace-loader',
            options: {
              strict: true,
              search: 'await import(config.package)',
              replace: 'await import(/* webpackIgnore: true */ config.package)',
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  [
                    '@tailwindcss/postcss',
                    {
                      base: buildConfig.openwork.root,
                    },
                  ],
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
        type: 'asset/resource',
      },
      {
        test: /\.wasm$/,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    },
    alias: {
      '@': path.resolve(buildConfig.openwork.root, 'src/renderer/src'),
      '@renderer': path.resolve(buildConfig.openwork.root, 'src/renderer/src'),
      electron: path.resolve(__dirname, 'src/web-electron.ts'),
      'electron-store': path.resolve(__dirname, 'src/web-electron-store.ts'),
      'sql.js$': path.resolve(__dirname, 'src/web-sqljs.ts'),
      process: path.resolve(__dirname, 'src/web-process.ts'),
      child_process: path.resolve(__dirname, 'src/web-child-process.ts'),
      deepagents: path.resolve(buildConfig.deepagents.root, 'libs/deepagents/src/index.ts'),
      async_hooks: path.resolve(__dirname, 'src/web-async-hooks.ts'),
    },
    fallback: {
      constants: require.resolve('constants-browserify'),
      url: require.resolve('url/'),
      util: require.resolve('util/'),
      assert: require.resolve('assert/'),
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      fs: require.resolve('wasabio'),
      events: require.resolve('eventemitter2'),
      vm: require.resolve('vm-browserify'),
    },
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
      resource.request = resource.request.replace(/^node:/, '');
    }),
    new webpack.NormalModuleReplacementPlugin(/^fs$/, (resource) => {
      resource.request = path.resolve(__dirname, 'src/web-filesystem.ts');
    }),
    new webpack.NormalModuleReplacementPlugin(/^fs\/promises$/, (resource) => {
      resource.request = path.resolve(__dirname, 'src/web-filesystem.ts');
    }),
    new webpack.NormalModuleReplacementPlugin(/^node:fs\/promises$/, (resource) => {
      resource.request = path.resolve(__dirname, 'src/web-filesystem.ts');
    }),
    new webpack.NormalModuleReplacementPlugin(/^crypto$/, (resource) => {
      resource.request = path.resolve(__dirname, 'src/web-crypto.ts');
    }),
    new webpack.DefinePlugin({
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_NODE_VERSION__: JSON.stringify(process.versions.node),
    }),
    new webpack.ProvidePlugin({
      process: [path.resolve(__dirname, 'src/web-process.ts'), 'default'],
      Buffer: ['buffer', 'Buffer'],
    }),
    new HtmlWebpackPlugin({
      favicon: path.join(__dirname, 'src/favicon.ico'),
      template: path.join(__dirname, 'src/index.html'),
      chunks: ['init'],
    }),
  ],
  parallelism: 100,
  devServer: {
    static: './dist',
    hot: true,
    port: 3000,
  },
};

export default config;
