import { ImageResponse } from 'next/og';

// Keep a simple, deterministic icon route to avoid the intermittent metadata loader crash
// seen with more complex dynamic logic. This must have a default export for Next.

export const size = {
	width: 192,
	height: 192,
};

export const contentType = 'image/png';

export default function Icon() {
	return new ImageResponse(
		(
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: '#ffffff',
				}}
			>
				{/* Infinity symbol in green */}
				<svg
					width="160"
					height="160"
					viewBox="0 0 100 100"
					style={{ marginTop: 10 }}
				>
					<path
						d="M25 50c0-8.28 6.72-15 15-15 5.52 0 10.35 2.99 12.95 7.44L60 50l-7.05 7.56C50.35 62.01 45.52 65 40 65c-8.28 0-15-6.72-15-15zm50 0c0 8.28-6.72 15-15 15-5.52 0-10.35-2.99-12.95-7.44L40 50l7.05-7.56C49.65 37.99 54.48 35 60 35c8.28 0 15 6.72 15 15z"
						fill="none"
						stroke="#1E7F43"
						strokeWidth="8"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</div>
		),
		size
	);
}
