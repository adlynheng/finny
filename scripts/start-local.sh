#!/usr/bin/env bash
# Metro against the local Supabase stack instead of the cloud project in .env. The shell's
# values win over .env (scripts/build-env.js), so nothing on disk changes; restart plain
# `yarn start --reset-cache` to go back to the cloud. Seed the stack first with
# `yarn supabase db reset --local` (supabase/seed.sql) and sign in with its local user.
set -euo pipefail
eval "$(yarn supabase status -o env | grep -E '^(API_URL|ANON_KEY)=')"
export SUPABASE_URL="$API_URL" SUPABASE_ANON_KEY="$ANON_KEY"
# Babel inlines the values, so the cache built against the cloud has to go.
exec yarn start --reset-cache "$@"
