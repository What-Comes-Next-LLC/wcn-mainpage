#!/usr/bin/env python3
"""
WCN Wellness Infographic Pipeline — v1
Connects: User Input → LLM (structured extraction) → Gamma API (infographic PDF)

Usage:
  python pipeline.py

Requirements:
  pip install requests anthropic  # or openai, or mistralai — swap the LLM call

Environment variables:
  GAMMA_API_KEY    — your Gamma API key
  ANTHROPIC_API_KEY — your LLM API key (swap for your provider)
"""

import os
import sys
import time
import json
import requests

# -------------------------------------------------------------------
# CONFIG — Change the LLM provider here
# -------------------------------------------------------------------
LLM_PROVIDER = "anthropic"  # Options: "anthropic", "openai", "mistral", "manual"
GAMMA_API_KEY = os.environ.get("GAMMA_API_KEY", "")
LLM_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")  # Swap env var name for your provider
GAMMA_THEME_ID = "vel6z003nj8ihga"

# -------------------------------------------------------------------
# THE FIXED SYSTEM PROMPT — This never changes
# -------------------------------------------------------------------
SYSTEM_PROMPT = """You are a certified wellness coach applying NASM CPT (Certified Personal Trainer) and NASM CNC (Certified Nutrition Coach) principles. Your job is to analyze a person's self-described daily routine alongside their fitness goal and produce a structured one-page wellness snapshot.

You will receive:
- DEMOGRAPHICS: Name, age, and occupation
- GOAL: Their fitness goal in their own words
- DAILY ROUTINE: A free-form description of their typical day

ANALYSIS FRAMEWORK:
1. Identify meal timing, composition (when inferable), and gaps
2. Identify movement patterns, sedentary periods, and activity type/duration
3. Identify sleep/recovery patterns and stress indicators
4. Identify occupation-related factors (travel, irregular schedule, physical demands, sedentary work)
5. Cross-reference findings against their stated goal
6. Prioritize 3-5 actionable, specific recommendations that address the biggest gaps between their current habits and their goal

OUTPUT RULES:
- Write in second person ("you"), warm and direct — like a coach sitting across from them
- Do NOT use clinical jargon; explain concepts in plain language
- Every recommendation must be actionable and specific (not "eat better" but "add a protein source to your first meal — eggs, Greek yogurt, or a shake")
- Tie each recommendation back to their goal so they understand WHY
- Keep total output under 500 words — this must fit a single infographic page
- Do NOT invent details the user didn't mention; if something is unclear, note it as an area to explore

OUTPUT FORMAT (use this exact markdown structure):

# Wellness Snapshot: [First Name]

## Your Goal
[Restate their goal in encouraging, clear terms — 1-2 sentences max]

## What We Noticed
[3-4 bullet points identifying key patterns from their routine. Be specific — reference their actual habits. Each bullet should be 1 sentence.]

## Your Game Plan
[3-5 numbered recommendations. Each should be 2-3 sentences: what to do, how to do it, and why it matters for their goal. These are the core of the infographic.]

## Quick Wins
[2-3 things they can do TODAY that require zero prep or equipment. Keep each to one sentence.]

## Coach's Note
[1-2 sentences of encouragement that reference something specific from their routine — show you were listening.]"""


def collect_user_input():
    """Collect the three inputs from the user."""
    print("\n" + "=" * 60)
    print("  WCN WELLNESS SNAPSHOT — Client Intake")
    print("=" * 60)

    print("\n--- Demographics ---")
    name = input("Name: ").strip()
    age = input("Age: ").strip()
    occupation = input("Occupation: ").strip()

    print("\n--- Fitness Goal ---")
    print("(Describe your fitness goal in your own words)")
    goal = input("> ").strip()

    print("\n--- Take Me Through Your Day ---")
    print("(Describe a typical day — what you eat, when you move,")
    print(" how you sleep, what your schedule looks like.)")
    print("(Press Enter twice when done)")

    lines = []
    while True:
        line = input("> " if not lines else "  ")
        if line == "" and lines and lines[-1] == "":
            break
        lines.append(line)
    routine = "\n".join(lines).strip()

    return {
        "name": name,
        "age": age,
        "occupation": occupation,
        "goal": goal,
        "routine": routine,
    }


def build_user_message(user_input):
    """Build the user message from collected input."""
    return f"""DEMOGRAPHICS:
Name: {user_input['name']}
Age: {user_input['age']}
Occupation: {user_input['occupation']}

GOAL:
{user_input['goal']}

DAILY ROUTINE:
{user_input['routine']}"""


def call_llm(user_message):
    """Call the LLM with the fixed system prompt + user input.
    Swap this function body for your provider."""

    if LLM_PROVIDER == "anthropic":
        import anthropic

        client = anthropic.Anthropic(api_key=LLM_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text

    elif LLM_PROVIDER == "openai":
        import openai

        client = openai.OpenAI(api_key=LLM_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=1024,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )
        return response.choices[0].message.content

    elif LLM_PROVIDER == "manual":
        # For testing without an LLM API — paste output manually
        print("\n[MANUAL MODE] Paste the LLM output below (Ctrl+D when done):")
        return sys.stdin.read().strip()

    else:
        raise ValueError(f"Unknown LLM provider: {LLM_PROVIDER}")


def call_gamma(llm_output):
    """Send structured content to Gamma and return the generation ID."""

    payload = {
        "inputText": llm_output,
        "textMode": "preserve",
        "format": "document",
        "numCards": 1,
        "cardOptions": {"dimensions": "letter"},
        "themeId": GAMMA_THEME_ID,
        "textOptions": {
            "audience": "health-conscious adults receiving personalized coaching",
            "language": "en",
        },
        "imageOptions": {"source": "noImages"},
        "additionalInstructions": (
            "Format this as a single-page wellness infographic. "
            "Use clear visual hierarchy with the section headers as prominent dividers. "
            "Use smart layouts — callout boxes for the Quick Wins section, "
            "a numbered list layout for the Game Plan. "
            "Keep the Coach's Note visually distinct, like a personal aside or signature block. "
            "The overall feel should be clean, modern, and motivating — not clinical. "
            "This is a personalized coaching document, not a medical report."
        ),
        "exportAs": "pdf",
    }

    response = requests.post(
        "https://public-api.gamma.app/v1.0/generations",
        headers={
            "X-API-KEY": GAMMA_API_KEY,
            "Content-Type": "application/json",
        },
        json=payload,
    )
    response.raise_for_status()
    data = response.json()

    if "warnings" in data and data["warnings"]:
        print(f"  ⚠️  Gamma warnings: {data['warnings']}")

    return data["generationId"]


def poll_gamma(generation_id, max_attempts=60, interval=5):
    """Poll Gamma until the generation completes or fails."""

    url = f"https://public-api.gamma.app/v1.0/generations/{generation_id}"
    headers = {"X-API-KEY": GAMMA_API_KEY}

    for attempt in range(1, max_attempts + 1):
        time.sleep(interval)
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        result = response.json()
        status = result.get("status", "unknown")

        print(f"  Poll {attempt}: {status}")

        if status == "completed":
            return result
        elif status == "failed":
            error = result.get("error", {})
            raise RuntimeError(
                f"Gamma generation failed: {error.get('message', 'Unknown error')}"
            )

    raise TimeoutError("Gamma generation timed out after 5 minutes")


def main():
    # Preflight checks
    if not GAMMA_API_KEY:
        print("❌ Set GAMMA_API_KEY environment variable")
        sys.exit(1)
    if LLM_PROVIDER != "manual" and not LLM_API_KEY:
        print(f"❌ Set your LLM API key environment variable for provider '{LLM_PROVIDER}'")
        sys.exit(1)

    # Step 1: Collect input
    user_input = collect_user_input()
    user_message = build_user_message(user_input)

    print("\n📋 Input collected. Sending to LLM...")

    # Step 2: LLM transformation
    llm_output = call_llm(user_message)

    print("\n" + "-" * 60)
    print("LLM OUTPUT PREVIEW:")
    print("-" * 60)
    print(llm_output[:500] + ("..." if len(llm_output) > 500 else ""))
    print("-" * 60)

    # Confirmation gate
    proceed = input("\nSend to Gamma? [Y/n]: ").strip().lower()
    if proceed == "n":
        print("Aborted. LLM output saved above for review.")
        return

    # Step 3: Gamma generation
    print("\n🎨 Sending to Gamma...")
    generation_id = call_gamma(llm_output)
    print(f"  Generation ID: {generation_id}")
    print("  Polling for result...")

    result = poll_gamma(generation_id)

    # Done
    print("\n" + "=" * 60)
    print("  ✅ INFOGRAPHIC READY")
    print("=" * 60)
    print(f"  View in Gamma: {result.get('gammaUrl', 'N/A')}")
    print(f"  Download PDF:  {result.get('exportUrl', 'N/A')}")
    credits = result.get("credits", {})
    print(f"  Credits used:  {credits.get('deducted', '?')}")
    print(f"  Credits left:  {credits.get('remaining', '?')}")
    print()


if __name__ == "__main__":
    main()
