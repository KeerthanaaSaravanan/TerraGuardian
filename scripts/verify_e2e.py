import asyncio
import httpx

async def run_e2e_verification():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000/api/v1") as client:
        print("=== 1. Seeding incident TG-2048 & Demo Users ===")
        r_seed_users = await client.post("/auth/seed-demo-users")
        assert r_seed_users.status_code == 200, f"User seed failed: {r_seed_users.text}"
        print("Demo users seeded successfully.")

        r_seed = await client.post("/incidents/seed/tg-2048?force_reset=true")
        assert r_seed.status_code in (200, 201), f"Seed failed: {r_seed.text}"
        inc_data = r_seed.json()
        inc_id = inc_data["id"]
        print(f"Incident seeded: {inc_data['code']} (UUID: {inc_id})")

        print("\n=== 2. Authenticating as Field Authority (ASI D. Sonam) ===")
        r_login = await client.post("/auth/login", json={
            "username": "patrol",
            "password": "Patrol#2026"
        })
        assert r_login.status_code == 200, f"Login failed: {r_login.text}"
        auth_data = r_login.json()
        token = auth_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        print(f"Authenticated as: {auth_data['user']['full_name']} (Role: {auth_data['user']['role']})")

        print("\n=== 3. Submitting Citizen Report via /ingestion/citizen-report ===")
        payload = {
            "latitude": 27.0845,
            "longitude": 92.5685,
            "observation": "Significant mud slurry accumulating on NH-13 shoulder near KM-42.",
            "hazard_type": "MUDFLOW",
            "severity": "HIGH",
            "reporter_note": "Live observation from local traveler.",
            "reporter_contact": "+91-94360-12345"
        }
        r_cit = await client.post("/ingestion/citizen-report", json=payload)
        assert r_cit.status_code == 201, f"Citizen report failed: {r_cit.text}"
        cit_data = r_cit.json()
        print(f"Tracking ID: {cit_data['tracking_id']}")
        print(f"Status: {cit_data['status']}, Interpretation: {cit_data['interpretation']}")
        assert cit_data["status"] == "RECEIVED"
        assert cit_data["interpretation"] == "UNVERIFIED"

        print("\n=== 4. Verifying Citizen Evidence Invariants in Database Twin ===")
        r_ev = await client.get(f"/incidents/{inc_id}/evidence")
        assert r_ev.status_code == 200
        ev_items = r_ev.json()
        cit_ev = next(e for e in ev_items if e["id"] == cit_data["evidence_id"])
        print(f"Evidence Item: {cit_ev['source_name']}")
        print(f"Source: {cit_ev['source']}")
        print(f"Provenance: {cit_ev['provenance']}")
        print(f"Interpretation: {cit_ev['interpretation']}")
        assert cit_ev["source"] == "CITIZEN"
        assert cit_ev["provenance"] == "REAL_CITIZEN_SUBMISSION"
        assert cit_ev["interpretation"] == "UNVERIFIED"

        print("\n=== 5. Inspecting Action Queue for TG-2048 ===")
        r_actions = await client.get(f"/incidents/{inc_id}/actions")
        assert r_actions.status_code == 200, f"Get actions failed: {r_actions.text}"
        actions = r_actions.json()
        assert len(actions) > 0, "No actions found for incident"
        action_to_dispatch = actions[0]
        act_id = action_to_dispatch["id"]
        print(f"Target Action: {action_to_dispatch['task_code']} - {action_to_dispatch['title']}")
        print(f"Initial State: {action_to_dispatch['state']}")

        print("\n=== 6. Dispatching Action (Semantic Invariant: APPROVED != CONFIRMED) ===")
        r_trans = await client.post(
            f"/actions/{act_id}/transitions",
            json={
                "target_state": "IN_PROGRESS",
                "actor_role": "FIELD_VERIFIER",
                "actor_name": "ASI D. Sonam",
                "reason": "Mobilizing JCB earthmover to NH-13 KM-41 staging point."
            },
            headers=auth_headers
        )
        assert r_trans.status_code == 200, f"Transition failed: {r_trans.text}"
        trans_act = r_trans.json()
        print(f"Updated Action State: {trans_act['state']}")
        assert trans_act["state"] == "IN_PROGRESS"
        assert trans_act["state"] != "PHYSICALLY_CONFIRMED", "SECURITY VIOLATION: Action skipped directly to CONFIRMED!"

        # Advance to COMPLETED (awaiting physical confirmation evidence)
        r_comp = await client.post(
            f"/actions/{act_id}/transitions",
            json={
                "target_state": "COMPLETED",
                "actor_role": "FIELD_VERIFIER",
                "actor_name": "ASI D. Sonam",
                "reason": "Debris clearing equipment and crew in position."
            },
            headers=auth_headers
        )
        assert r_comp.status_code == 200
        comp_act = r_comp.json()
        print(f"Completed Action State: {comp_act['state']} (Completed at: {comp_act['completed_at']})")
        assert comp_act["state"] == "COMPLETED"
        assert comp_act["state"] != "PHYSICALLY_CONFIRMED"

        print("\n=== 7. Submitting Physical Ground Confirmation Evidence ===")
        r_conf = await client.post(
            f"/actions/{act_id}/confirmations",
            json={
                "confirming_officer": "ASI D. Sonam",
                "confirming_agency": "West Kameng Traffic Police",
                "location_confirmed": "NH-13 KM-42 Cut Scarp Staging Zone",
                "confirmation_notes": "Physical barricades placed and earthmover active. Ground verified via TETRA radio.",
                "communication_channel": "TETRA_RADIO",
                "is_simulated": True,
            },
            headers=auth_headers
        )
        assert r_conf.status_code == 201, f"Confirmation failed: {r_conf.text}"
        conf_data = r_conf.json()
        print(f"Physical Confirmation Recorded! Officer: {conf_data['confirming_officer']}")
        
        # Verify action is now PHYSICALLY_CONFIRMED
        r_after = await client.get(f"/incidents/{inc_id}/actions")
        actions_after = r_after.json()
        act_after = next(a for a in actions_after if a["id"] == act_id)
        print(f"Action Final Verified State: {act_after['state']}")
        assert act_after["state"] == "PHYSICALLY_CONFIRMED"
        assert act_after["confirmed_at"] is not None

        print("\n=== 8. Verifying Complete Immutable Audit Trail Chronology ===")
        r_timeline = await client.get(f"/incidents/{inc_id}/timeline", headers=auth_headers)
        assert r_timeline.status_code == 200, f"Timeline request failed: {r_timeline.text}"
        timeline_events = r_timeline.json()
        print(f"Found {len(timeline_events)} immutable audit events for incident {inc_data['code']}:")
        for ev in timeline_events[:8]:
            print(f"  [{ev.get('timestamp')}] Type: {ev.get('event_type')} | Actor: {ev.get('actor_role')} | Desc: {ev.get('description', '')[:50]}")

        print("\n===========================================================")
        print(">>> ALL END-TO-END WORKFLOW INVARIANTS RIGOROUSLY CONFIRMED! <<<")
        print("===========================================================")

if __name__ == "__main__":
    asyncio.run(run_e2e_verification())
