import json

from space_agent import protocol


def test_speaker_frame_and_audio_out_round_trip():
    frame = protocol.speaker_frame("did:plc:alice", b"\x01\x02")
    assert frame[0] == 0x03 and frame[1] == len("did:plc:alice") and frame.endswith(b"\x01\x02")
    out = bytes([0x11, 2]) + b"u1" + b"\x00\x01"
    assert protocol.parse_audio_out(out) == ("u1", b"\x00\x01")
    assert protocol.parse_audio_out(b"\x01") is None


def test_caption_payload_has_no_extra_fields():
    assert json.loads(protocol.caption("did:plc:a", "アリス", "こんにちは")) == {
        "type": "caption", "speaker": "did:plc:a", "name": "アリス", "text": "こんにちは"}
    assert json.loads(protocol.captions_state(True)) == {"type": "captions.paused"}


def test_role_of():
    assert protocol.role_of('{"role":"speaker"}') == "speaker"
    assert protocol.role_of('{"role":"x"}') == "listener"
    assert protocol.role_of("not json") == "listener"
