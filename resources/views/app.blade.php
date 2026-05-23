<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title inertia>{{ config('app.name', 'Stupid Log') }}</title>
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        <style>
            .grid-rows-\[120px_minmax\(0\,1fr\)_86px\] {
                grid-template-rows: 120px minmax(0, 1fr) 96px !important;
            }

            .h-\[86px\].shrink-0.justify-center {
                height: 96px !important;
                padding-top: 14px !important;
                padding-bottom: 14px !important;
            }

            .h-\[86px\].shrink-0.justify-center > .overflow-x-auto.rounded-\[26px\].bg-black {
                overflow-x: hidden !important;
                overflow-y: hidden !important;
                padding: 14px 18px !important;
                scrollbar-width: none !important;
            }

            .h-\[86px\].shrink-0.justify-center > .overflow-x-auto.rounded-\[26px\].bg-black::-webkit-scrollbar {
                display: none !important;
            }
        </style>
        @inertiaHead
    </head>
    <body>
        @inertia
    </body>
</html>
