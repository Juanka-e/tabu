import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";

const serverUrl = process.env.SOCKET_TEST_URL ?? "http://127.0.0.1:3000";
const timeoutMs = 15_000;

interface PublicPlayer {
    id: string;
    playerId: string;
    ad: string;
    takim: "A" | "B" | null;
    online: boolean;
    rol: string;
    [key: string]: unknown;
}

interface LobbyPayload {
    odaKodu: string;
    oyuncular: PublicPlayer[];
    startReadiness: {
        ready: boolean;
        activePlayers: number;
        minimumPlayers: number;
        teamAPlayers: number;
        teamBPlayers: number;
    };
}

function connectGuest(name: string, roomCode?: string): Promise<{
    socket: Socket;
    lobby: LobbyPayload;
}> {
    return new Promise((resolve, reject) => {
        const socket = io(serverUrl, {
            path: "/api/socketio",
            transports: ["websocket"],
            forceNew: true,
        });
        const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error(`${name} socket request timed out`));
        }, timeoutMs);

        socket.on("connect", () => {
            socket.emit("room:request", {
                kullaniciAdi: name,
                ...(roomCode ? { odaKodu: roomCode } : {}),
            });
        });
        socket.on("lobiGuncelle", (lobby: LobbyPayload) => {
            if (roomCode && lobby.odaKodu !== roomCode) return;
            clearTimeout(timeout);
            resolve({ socket, lobby });
        });
        socket.on("connect_error", (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        socket.on("hata", (message: string) => {
            clearTimeout(timeout);
            socket.disconnect();
            reject(new Error(message));
        });
    });
}

async function run(): Promise<void> {
    const sockets: Socket[] = [];

    try {
        const creator = await connectGuest("CapacityGuestA");
        sockets.push(creator.socket);
        assert.equal(creator.lobby.startReadiness.ready, false);
        assert.equal(creator.lobby.startReadiness.minimumPlayers, 2);

        const joiner = await connectGuest(
            "CapacityGuestB",
            creator.lobby.odaKodu
        );
        sockets.push(joiner.socket);

        const joinedLobby = await new Promise<LobbyPayload>((resolve, reject) => {
            const timeout = setTimeout(
                () => reject(new Error("Updated lobby payload timed out")),
                timeoutMs
            );
            const handleLobby = (lobby: LobbyPayload) => {
                if (lobby.oyuncular.length !== 2) return;
                clearTimeout(timeout);
                creator.socket.off("lobiGuncelle", handleLobby);
                resolve(lobby);
            };
            creator.socket.on("lobiGuncelle", handleLobby);

            if (joiner.lobby.oyuncular.length === 2) {
                clearTimeout(timeout);
                creator.socket.off("lobiGuncelle", handleLobby);
                resolve(joiner.lobby);
            }
        });

        assert.equal(joinedLobby.startReadiness.ready, true);
        assert.equal(joinedLobby.startReadiness.activePlayers, 2);
        assert.equal(joinedLobby.startReadiness.teamAPlayers, 1);
        assert.equal(joinedLobby.startReadiness.teamBPlayers, 1);

        for (const player of joinedLobby.oyuncular) {
            assert.equal("userId" in player, false);
            assert.equal("identityType" in player, false);
            assert.equal("usernameSnapshot" in player, false);
            assert.equal("ip" in player, false);
        }

        console.log("room capacity socket integration test passed");
    } finally {
        for (const socket of sockets) {
            socket.disconnect();
        }
    }
}

void run();
