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
				<div
					style={{
						width: '80%',
						height: '80%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						borderRadius: 40,
						backgroundColor: '#1E7F43',
						color: '#ffffff',
						fontSize: 64,
						fontWeight: 800,
						fontFamily: 'system-ui',
					}}
				>
					SW
				</div>
			</div>
		),
		size
	);
}
