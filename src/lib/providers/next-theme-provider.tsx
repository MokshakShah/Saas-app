'use client';
import { ThemeProvider } from 'next-themes';
import * as React from 'react';
import type { ThemeProviderProps } from 'next-themes/dist/types';

export default function NextThemeProvider({ children, ...props }: React.PropsWithChildren<ThemeProviderProps>) {
	return (
		<ThemeProvider {...props}>
			{children}
		</ThemeProvider>
	);
}