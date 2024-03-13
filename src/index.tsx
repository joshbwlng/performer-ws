import { Performer, Assistant, Repeat, User } from '@performer/core';
import { signal } from '@preact/signals-core';
import type { Signal } from '@preact/signals-core';
import { WebSocketServer } from 'ws';

function init(): {
	performer: Performer;
	stop: Signal<boolean>;
} {
	const stop = signal(false);
	function App() {
		return () => (
			<>
				<system>You are an assistant for a TypeScript programmer</system>
				<Repeat stop={stop}>
					<User />
					<Assistant />
				</Repeat>
			</>
		);
	}
	return {
		performer: new Performer(<App />),
		stop,
	};
}

// Connect to this with something like `websocat ws://localhost:8080`
new WebSocketServer({
	port: 8080,
}).on('connection', async (socket) => {
	const thread = init();
	thread.performer.addEventListener('message', (msg) => {
		const { content, role } = msg.detail.message;
		if (role === 'assistant' && content != null) {
			socket.send(`[Assistant] ${content.toString()}`);
		}
	});
	thread.performer.start();
	socket.send('[Assistant] Hi, how can I help?');

	socket.on('message', (message) => {
		const msg = message.toString().trim();
		if (msg === 'stop') {
			thread.stop.value = true;
			socket.close(1000, 'Goodbye!');
		} else {
			thread.performer.input({
				role: 'user',
				content: msg,
			});
		}
	});

	socket.on('close', () => {
		if (!thread.performer.hasFinished) {
			thread.performer.finish();
		}
	});
});
