"use client";

import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/* ─────────────────── data ─────────────────── */

const architectureSteps = [
  {
    num: "1",
    title: "User logs in on your site",
    detail:
      "Your existing username/password form stays unchanged. Validate credentials in your own backend.",
  },
  {
    num: "2",
    title: "Your backend calls init-auth",
    detail:
      "POST /api/product/v1/init-auth with partnerId, userId, callbackUrl, and a random state nonce.",
  },
  {
    num: "3",
    title: "User completes visual challenge",
    detail:
      "Redirect or popup the user to the verifyPath. They solve the challenge on our hosted secure page.",
  },
  {
    num: "4",
    title: "Callback returns result",
    detail:
      "We redirect back to your callbackUrl with result, signature, and the original state.",
  },
  {
    num: "5",
    title: "Your backend validates signature",
    detail:
      "POST /api/product/v1/partner/consume-result with the signature. We confirm PASS or deny.",
  },
  {
    num: "6",
    title: "Grant or deny session",
    detail:
      "On PASS create your app session. On FAIL/LOCKED deny login. No visual secrets ever leave our system.",
  },
];

const endpoints = [
  {
    method: "POST",
    path: "/api/product/v1/init-auth",
    desc: "Start a visual verification session",
    params: "partnerId, userId, callbackUrl, state",
    response: "sessionToken, verifyPath, expiresAt",
  },
  {
    method: "GET",
    path: "/api/product/v1/challenge/:sessionToken",
    desc: "Fetch challenge data (used by our hosted UI)",
    params: "sessionToken (path)",
    response: "vegetables, alphabetGrid, keypadLayout, stage, fruitSelectionComplete",
  },
  {
    method: "POST",
    path: "/api/product/v1/verify",
    desc: "Step 1 select fruit, Step 2 submit alphabet inputs (hosted UI)",
    params: "sessionToken + selectedFruit OR sessionToken + inputs",
    response: "FRUIT_OK/PASS/FAIL, status, attempts, verificationSignature",
  },
  {
    method: "POST",
    path: "/api/product/v1/partner/consume-result",
    desc: "Server-side signature validation (MANDATORY)",
    params: "signature",
    response: "result, userId, partnerId, state, consumedAt",
  },
  {
    method: "GET",
    path: "/api/product/v1/session/:sessionToken",
    desc: "Check session status (for polling/audit)",
    params: "sessionToken (path)",
    response: "status, attemptCount, verifiedAt, consumedAt",
  },
  {
    method: "GET",
    path: "/api/product/v1/meta",
    desc: "API availability and routing metadata",
    params: "—",
    response: "product, mode, endpoints[]",
  },
];

const sdkExamples: Record<string, { label: string; lang: string; initAuth: string; consumeResult: string; callbackHandler: string }> = {
  nodejs: {
    label: "Node.js",
    lang: "javascript",
    initAuth: `// Node.js — Start visual verification
const crypto = require("crypto");

async function startVisualAuth(userId) {
  const state = crypto.randomUUID();

  const res = await fetch(
    \`\${process.env.FRAUDSHIELD_BASE_URL}/api/product/v1/init-auth?mode=live\`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.FRAUDSHIELD_API_KEY,
      },
      body: JSON.stringify({
        partnerId: process.env.FRAUDSHIELD_PARTNER_ID,
        userId,
        callbackUrl: \`\${process.env.APP_BASE_URL}/auth/visual/callback\`,
        state,
      }),
    }
  );

  if (!res.ok) throw new Error("Failed to start visual auth");
  const data = await res.json();

  // Store state in session for callback validation
  req.session.pendingVisual = { userId, state };

  return data; // { sessionToken, verifyPath, expiresAt }
}`,
    consumeResult: `// Node.js — Validate verification result
async function consumeVisualResult(signature) {
  const res = await fetch(
    \`\${process.env.FRAUDSHIELD_BASE_URL}/api/product/v1/partner/consume-result?mode=live\`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.FRAUDSHIELD_API_KEY,
      },
      body: JSON.stringify({ signature }),
    }
  );

  if (!res.ok) throw new Error("Signature validation failed");
  return await res.json();
  // { result: "PASS", userId, partnerId, state, consumedAt }
}`,
    callbackHandler: `// Node.js (Express) — Callback handler
app.get("/auth/visual/callback", async (req, res) => {
  const { result, signature, state } = req.query;
  const pending = req.session.pendingVisual;

  if (!pending || state !== pending.state) {
    req.session.pendingVisual = null;
    return res.status(401).send("Invalid state");
  }

  if (result !== "PASS" || !signature) {
    req.session.pendingVisual = null;
    return res.status(401).send("Visual verification failed");
  }

  const consumed = await consumeVisualResult(signature);
  req.session.user = consumed.userId;
  req.session.pendingVisual = null;

  return res.redirect("/dashboard");
});`,
  },
  python: {
    label: "Python",
    lang: "python",
    initAuth: `# Python (Flask/FastAPI) — Start visual verification
import os, uuid, requests

def start_visual_auth(user_id: str) -> dict:
    state = str(uuid.uuid4())

    response = requests.post(
        f"{os.environ['FRAUDSHIELD_BASE_URL']}/api/product/v1/init-auth",
        params={"mode": "live"},
        headers={
            "Content-Type": "application/json",
            "x-api-key": os.environ["FRAUDSHIELD_API_KEY"],
        },
        json={
            "partnerId": os.environ["FRAUDSHIELD_PARTNER_ID"],
            "userId": user_id,
            "callbackUrl": f"{os.environ['APP_BASE_URL']}/auth/visual/callback",
            "state": state,
        },
    )
    response.raise_for_status()

    # Store state in session for callback validation
    session["pending_visual"] = {"user_id": user_id, "state": state}

    return response.json()
    # { "sessionToken": "...", "verifyPath": "/verify/...", "expiresAt": "..." }`,
    consumeResult: `# Python — Validate verification result
def consume_visual_result(signature: str) -> dict:
    response = requests.post(
        f"{os.environ['FRAUDSHIELD_BASE_URL']}/api/product/v1/partner/consume-result",
        params={"mode": "live"},
        headers={
            "Content-Type": "application/json",
            "x-api-key": os.environ["FRAUDSHIELD_API_KEY"],
        },
        json={"signature": signature},
    )
    response.raise_for_status()
    return response.json()
    # { "result": "PASS", "userId": "...", "partnerId": "...", "state": "..." }`,
    callbackHandler: `# Python (Flask) — Callback handler
@app.route("/auth/visual/callback")
def visual_callback():
    result = request.args.get("result", "FAIL")
    signature = request.args.get("signature", "")
    state = request.args.get("state", "")
    pending = session.get("pending_visual")

    if not pending or state != pending["state"]:
        session.pop("pending_visual", None)
        abort(401, "Invalid state")

    if result != "PASS" or not signature:
        session.pop("pending_visual", None)
        abort(401, "Visual verification failed")

    consumed = consume_visual_result(signature)
    session["user"] = consumed["userId"]
    session.pop("pending_visual", None)

    return redirect("/dashboard")`,
  },
  java: {
    label: "Java",
    lang: "java",
    initAuth: `// Java (Spring Boot) — Start visual verification
@Service
public class FraudShieldService {

    @Value("\${fraudshield.base-url}")
    private String baseUrl;

    @Value("\${fraudshield.api-key}")
    private String apiKey;

    @Value("\${fraudshield.partner-id}")
    private String partnerId;

    private final WebClient webClient;

    public Map<String, Object> startVisualAuth(String userId, String callbackUrl, String state) {
        return webClient.post()
            .uri(baseUrl + "/api/product/v1/init-auth?mode=live")
            .header("Content-Type", "application/json")
            .header("x-api-key", apiKey)
            .bodyValue(Map.of(
                "partnerId", partnerId,
                "userId", userId,
                "callbackUrl", callbackUrl,
                "state", state
            ))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
            .block();
        // Returns: { sessionToken, verifyPath, expiresAt }
    }
}`,
    consumeResult: `// Java (Spring Boot) — Validate verification result
public Map<String, Object> consumeVisualResult(String signature) {
    return webClient.post()
        .uri(baseUrl + "/api/product/v1/partner/consume-result?mode=live")
        .header("Content-Type", "application/json")
        .header("x-api-key", apiKey)
        .bodyValue(Map.of("signature", signature))
        .retrieve()
        .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
        .block();
    // Returns: { result: "PASS", userId, partnerId, state, consumedAt }
}`,
    callbackHandler: `// Java (Spring Boot) — Callback controller
@GetMapping("/auth/visual/callback")
public String visualCallback(
    @RequestParam String result,
    @RequestParam String signature,
    @RequestParam String state,
    HttpSession session
) {
    Map<String, String> pending = (Map<String, String>) session.getAttribute("pendingVisual");

    if (pending == null || !state.equals(pending.get("state"))) {
        session.removeAttribute("pendingVisual");
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid state");
    }

    if (!"PASS".equals(result) || signature.isEmpty()) {
        session.removeAttribute("pendingVisual");
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Verification failed");
    }

    Map<String, Object> consumed = fraudShieldService.consumeVisualResult(signature);
    session.setAttribute("user", consumed.get("userId"));
    session.removeAttribute("pendingVisual");

    return "redirect:/dashboard";
}`,
  },
  php: {
    label: "PHP",
    lang: "php",
    initAuth: `<?php
// PHP — Start visual verification
function startVisualAuth(string $userId): array {
    $state = bin2hex(random_bytes(16));

    $payload = [
        "partnerId"   => getenv("FRAUDSHIELD_PARTNER_ID"),
        "userId"      => $userId,
        "callbackUrl" => getenv("APP_BASE_URL") . "/auth/visual/callback",
        "state"       => $state,
    ];

    $ch = curl_init(getenv("FRAUDSHIELD_BASE_URL") . "/api/product/v1/init-auth?mode=live");
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            "Content-Type: application/json",
            "x-api-key: " . getenv("FRAUDSHIELD_API_KEY"),
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 12,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 201) throw new Exception("Failed to start visual auth");

    $_SESSION["pending_visual"] = ["userId" => $userId, "state" => $state];

    return json_decode($response, true);
    // { sessionToken, verifyPath, expiresAt }
}`,
    consumeResult: `<?php
// PHP — Validate verification result
function consumeVisualResult(string $signature): array {
    $ch = curl_init(getenv("FRAUDSHIELD_BASE_URL") . "/api/product/v1/partner/consume-result?mode=live");
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            "Content-Type: application/json",
            "x-api-key: " . getenv("FRAUDSHIELD_API_KEY"),
        ],
        CURLOPT_POSTFIELDS     => json_encode(["signature" => $signature]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 12,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) throw new Exception("Signature validation failed");

    return json_decode($response, true);
    // { result: "PASS", userId, partnerId, state, consumedAt }
}`,
    callbackHandler: `<?php
// PHP — Callback handler
session_start();

$result    = $_GET["result"] ?? "FAIL";
$signature = $_GET["signature"] ?? "";
$state     = $_GET["state"] ?? "";
$pending   = $_SESSION["pending_visual"] ?? null;

if (!$pending || $state !== $pending["state"]) {
    unset($_SESSION["pending_visual"]);
    http_response_code(401);
    die("Invalid state");
}

if ($result !== "PASS" || empty($signature)) {
    unset($_SESSION["pending_visual"]);
    http_response_code(401);
    die("Visual verification failed");
}

$consumed = consumeVisualResult($signature);
$_SESSION["user"] = $consumed["userId"];
unset($_SESSION["pending_visual"]);

header("Location: /dashboard");
exit;`,
  },
  dotnet: {
    label: "ASP.NET",
    lang: "csharp",
    initAuth: `// ASP.NET (C#) — Start visual verification
public class FraudShieldService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;

    public FraudShieldService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _config = config;
        _http.DefaultRequestHeaders.Add("x-api-key", _config["FraudShield:ApiKey"]);
    }

    public async Task<InitAuthResponse> StartVisualAuthAsync(string userId, string state)
    {
        var payload = new
        {
            partnerId = _config["FraudShield:PartnerId"],
            userId,
            callbackUrl = $"{_config["App:BaseUrl"]}/auth/visual/callback",
            state
        };

        var response = await _http.PostAsJsonAsync(
            $"{_config["FraudShield:BaseUrl"]}/api/product/v1/init-auth?mode=live",
            payload
        );
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<InitAuthResponse>();
        // { SessionToken, VerifyPath, ExpiresAt }
    }
}`,
    consumeResult: `// ASP.NET (C#) — Validate verification result
public async Task<ConsumeResponse> ConsumeVisualResultAsync(string signature)
{
    var response = await _http.PostAsJsonAsync(
        $"{_config["FraudShield:BaseUrl"]}/api/product/v1/partner/consume-result?mode=live",
        new { signature }
    );
    response.EnsureSuccessStatusCode();

    return await response.Content.ReadFromJsonAsync<ConsumeResponse>();
    // { Result = "PASS", UserId, PartnerId, State, ConsumedAt }
}`,
    callbackHandler: `// ASP.NET (C#) — Callback controller
[HttpGet("/auth/visual/callback")]
public async Task<IActionResult> VisualCallback(
    [FromQuery] string result,
    [FromQuery] string signature,
    [FromQuery] string state)
{
    var pending = HttpContext.Session.GetString("PendingVisual");
    var pendingData = JsonSerializer.Deserialize<PendingVisual>(pending ?? "{}");

    if (pendingData == null || state != pendingData.State)
    {
        HttpContext.Session.Remove("PendingVisual");
        return Unauthorized("Invalid state");
    }

    if (result != "PASS" || string.IsNullOrEmpty(signature))
    {
        HttpContext.Session.Remove("PendingVisual");
        return Unauthorized("Verification failed");
    }

    var consumed = await _fraudShield.ConsumeVisualResultAsync(signature);
    HttpContext.Session.SetString("User", consumed.UserId);
    HttpContext.Session.Remove("PendingVisual");

    return Redirect("/dashboard");
}`,
  },
  go: {
    label: "Go",
    lang: "go",
    initAuth: `// Go — Start visual verification
package fraudshield

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
)

type InitAuthResponse struct {
    SessionToken string \`json:"sessionToken"\`
    VerifyPath   string \`json:"verifyPath"\`
    ExpiresAt    string \`json:"expiresAt"\`
}

func StartVisualAuth(userID, state string) (*InitAuthResponse, error) {
    payload, _ := json.Marshal(map[string]string{
        "partnerId":   os.Getenv("FRAUDSHIELD_PARTNER_ID"),
        "userId":      userID,
        "callbackUrl": os.Getenv("APP_BASE_URL") + "/auth/visual/callback",
        "state":       state,
    })

    req, _ := http.NewRequest("POST",
        os.Getenv("FRAUDSHIELD_BASE_URL")+"/api/product/v1/init-auth?mode=live",
        bytes.NewBuffer(payload),
    )
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", os.Getenv("FRAUDSHIELD_API_KEY"))

    resp, err := http.DefaultClient.Do(req)
    if err != nil { return nil, err }
    defer resp.Body.Close()

    if resp.StatusCode != 201 {
        return nil, fmt.Errorf("init-auth failed: %d", resp.StatusCode)
    }

    var result InitAuthResponse
    json.NewDecoder(resp.Body).Decode(&result)
    return &result, nil
}`,
    consumeResult: `// Go — Validate verification result
type ConsumeResponse struct {
    Result     string \`json:"result"\`
    UserID     string \`json:"userId"\`
    PartnerID  string \`json:"partnerId"\`
    State      string \`json:"state"\`
    ConsumedAt string \`json:"consumedAt"\`
}

func ConsumeVisualResult(signature string) (*ConsumeResponse, error) {
    payload, _ := json.Marshal(map[string]string{"signature": signature})

    req, _ := http.NewRequest("POST",
        os.Getenv("FRAUDSHIELD_BASE_URL")+"/api/product/v1/partner/consume-result?mode=live",
        bytes.NewBuffer(payload),
    )
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", os.Getenv("FRAUDSHIELD_API_KEY"))

    resp, err := http.DefaultClient.Do(req)
    if err != nil { return nil, err }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        return nil, fmt.Errorf("consume-result failed: %d", resp.StatusCode)
    }

    var result ConsumeResponse
    json.NewDecoder(resp.Body).Decode(&result)
    return &result, nil
}`,
    callbackHandler: `// Go (net/http) — Callback handler
func visualCallbackHandler(w http.ResponseWriter, r *http.Request) {
    result := r.URL.Query().Get("result")
    signature := r.URL.Query().Get("signature")
    state := r.URL.Query().Get("state")

    session, _ := store.Get(r, "session")
    pending, ok := session.Values["pendingVisual"].(PendingVisual)

    if !ok || state != pending.State {
        delete(session.Values, "pendingVisual")
        session.Save(r, w)
        http.Error(w, "Invalid state", http.StatusUnauthorized)
        return
    }

    if result != "PASS" || signature == "" {
        delete(session.Values, "pendingVisual")
        session.Save(r, w)
        http.Error(w, "Verification failed", http.StatusUnauthorized)
        return
    }

    consumed, err := ConsumeVisualResult(signature)
    if err != nil {
        http.Error(w, "Consume failed", http.StatusInternalServerError)
        return
    }

    session.Values["user"] = consumed.UserID
    delete(session.Values, "pendingVisual")
    session.Save(r, w)

    http.Redirect(w, r, "/dashboard", http.StatusFound)
}`,
  },
  ruby: {
    label: "Ruby",
    lang: "ruby",
    initAuth: `# Ruby (Rails) — Start visual verification
class FraudShieldService
  BASE_URL   = ENV["FRAUDSHIELD_BASE_URL"]
  API_KEY    = ENV["FRAUDSHIELD_API_KEY"]
  PARTNER_ID = ENV["FRAUDSHIELD_PARTNER_ID"]

  def self.start_visual_auth(user_id:, state:, callback_url:)
    uri = URI("#{BASE_URL}/api/product/v1/init-auth?mode=live")

    response = Net::HTTP.post(uri,
      {
        partnerId:   PARTNER_ID,
        userId:      user_id,
        callbackUrl: callback_url,
        state:       state
      }.to_json,
      "Content-Type" => "application/json",
      "x-api-key"    => API_KEY
    )

    raise "Init-auth failed: #{response.code}" unless response.code == "201"

    JSON.parse(response.body)
    # { "sessionToken" => "...", "verifyPath" => "...", "expiresAt" => "..." }
  end
end`,
    consumeResult: `# Ruby — Validate verification result
def self.consume_visual_result(signature:)
  uri = URI("#{BASE_URL}/api/product/v1/partner/consume-result?mode=live")

  response = Net::HTTP.post(uri,
    { signature: signature }.to_json,
    "Content-Type" => "application/json",
    "x-api-key"    => API_KEY
  )

  raise "Consume failed: #{response.code}" unless response.code == "200"

  JSON.parse(response.body)
  # { "result" => "PASS", "userId" => "...", "partnerId" => "...", "state" => "..." }
end`,
    callbackHandler: `# Ruby (Rails) — Callback controller
class VisualCallbackController < ApplicationController
  def callback
    pending = session[:pending_visual]

    unless pending && params[:state] == pending["state"]
      session.delete(:pending_visual)
      return render plain: "Invalid state", status: :unauthorized
    end

    unless params[:result] == "PASS" && params[:signature].present?
      session.delete(:pending_visual)
      return render plain: "Verification failed", status: :unauthorized
    end

    consumed = FraudShieldService.consume_visual_result(signature: params[:signature])
    session[:user] = consumed["userId"]
    session.delete(:pending_visual)

    redirect_to "/dashboard"
  end
end`,
  },
  react: {
    label: "React (Frontend)",
    lang: "javascript",
    initAuth: `// React — Login component with visual auth
import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const startLogin = async () => {
    setLoading(true);
    try {
      // Step 1: Validate credentials on your backend
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!loginRes.ok) throw new Error("Invalid credentials");

      // Step 2: Start visual verification (calls your backend, not FraudShield directly)
      const visualRes = await fetch("/api/auth/start-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: username.toLowerCase() }),
      });

      const { verifyPath, flow } = await visualRes.json();

      // Step 3: Open verification page
      if (flow === "redirect") {
        window.location.href = verifyPath;
      } else {
        const popup = window.open(verifyPath, "visual-auth", "width=540,height=780");
        if (!popup) window.location.href = verifyPath; // Fallback
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); startLogin(); }}>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={loading}>{loading ? "Verifying..." : "Sign In"}</button>
    </form>
  );
}`,
    consumeResult: `// React — Popup callback listener
// Add this in your login page component
useEffect(() => {
  const handleMessage = async (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== "VISUAL_PASSWORD_CALLBACK") return;

    if (event.data.result !== "PASS" || !event.data.signature) {
      alert("Visual verification failed");
      return;
    }

    // Call YOUR backend to consume the result (never call FraudShield directly)
    const res = await fetch("/api/auth/consume-visual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature: event.data.signature }),
    });

    if (res.ok) {
      window.location.href = "/dashboard";
    } else {
      alert("Session validation failed");
    }
  };

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, []);`,
    callbackHandler: `// React — Callback page (for redirect flow)
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VisualCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const result = params.get("result");
    const signature = params.get("signature");

    if (result !== "PASS" || !signature) {
      router.push("/login?error=visual_failed");
      return;
    }

    // In popup mode: post message back to opener
    if (window.opener) {
      window.opener.postMessage({
        type: "VISUAL_PASSWORD_CALLBACK",
        result,
        signature,
        state: params.get("state"),
      }, window.location.origin);
      window.close();
      return;
    }

    // In redirect mode: call your backend
    fetch("/api/auth/consume-visual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature }),
    }).then((res) => {
      router.push(res.ok ? "/dashboard" : "/login?error=consume_failed");
    });
  }, [params, router]);

  return <p>Completing verification...</p>;
}`,
  },
};

const envConfig = `# Your backend .env — Add these variables
FRAUDSHIELD_BASE_URL=https://fraudshield.example.com
FRAUDSHIELD_API_KEY=pk_live_your-api-key-here
FRAUDSHIELD_PARTNER_ID=your_company_id
APP_BASE_URL=https://your-app.example.com

# For test/sandbox (optional)
FRAUDSHIELD_SANDBOX_URL=https://sandbox.fraudshield.example.com
FRAUDSHIELD_SANDBOX_API_KEY=pk_test_your-sandbox-key`;

const securityRules = [
  "Never expose your live API key in frontend/client-side code.",
  "Always validate the state nonce in callbacks to prevent CSRF.",
  "Always call consume-result from your backend — never trust callback query params alone.",
  "Use HTTPS callback URLs in production (enforced by our API).",
  "Generate a unique random state for every authentication attempt.",
  "Treat all non-PASS results as login denial.",
  "Set reasonable session TTL; our challenges expire in 5 minutes by default.",
  "Log request IDs, verification results, and suspicious attempts for audit.",
];

const errorCodes = [
  { code: "400", meaning: "Bad request — invalid or missing parameters" },
  { code: "401", meaning: "Unauthorized — missing or invalid API key / token" },
  { code: "403", meaning: "Forbidden — callback URL not in allowlist, or wrong API key for partner" },
  { code: "404", meaning: "Not found — user not enrolled or session doesn't exist" },
  { code: "409", meaning: "Conflict — session already verified (duplicate submission)" },
  { code: "410", meaning: "Gone — session expired (past TTL)" },
  { code: "423", meaning: "Locked — too many failed attempts, session is locked" },
  { code: "429", meaning: "Rate limited — too many requests, slow down" },
];

/* ─────────────────── component ─────────────────── */

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState("nodejs");

  const currentSdk = sdkExamples[activeTab] || sdkExamples.nodejs;
  const sdkKeys = Object.keys(sdkExamples);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#f5f9ff] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_8%_0%,rgba(56,189,248,0.19),transparent_36%),radial-gradient(circle_at_88%_10%,rgba(45,212,191,0.16),transparent_35%),radial-gradient(circle_at_45%_0%,rgba(99,102,241,0.1),transparent_32%)] dark:opacity-30" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-24 sm:py-32">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white/50 p-10 shadow-2xl backdrop-blur-xl dark:bg-slate-900/50 dark:border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-emerald-50/50 dark:from-slate-900 dark:to-slate-800 -z-10" />
          
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Badge className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold tracking-widest text-white shadow-lg shadow-indigo-500/20 dark:bg-white dark:text-slate-900">
              DEVELOPER PORTAL
            </Badge>
            <Badge variant="outline" className="rounded-full border-slate-300 px-4 py-1.5 text-xs font-semibold tracking-widest dark:border-slate-700">
              PARTNER API V1.0
            </Badge>
          </div>

          <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl md:text-7xl mb-6">
            Build secure integration <br className="hidden lg:block"/> with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">zero logic leak.</span>
          </h1>
          
          <p className="max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 mb-10">
            Use these implementation patterns to add FraudShield as a precise second step. Your backend remains the session authority while we handle the cognitive verification.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg" className="rounded-full h-14 px-8 text-base font-semibold shadow-xl shadow-indigo-600/20 hover:scale-105 transition-transform bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">
              <Link href="/partner-live?flow=popup&mode=test">Launch Test Flow</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-14 px-8 text-base border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <Link href="/docs">Read API Docs</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-full h-14 px-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <Link href="/admin">Admin Panel</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm dark:bg-slate-900/50">
            <CardHeader className="pb-8">
              <CardTitle className="text-2xl font-bold">Integration Architecture</CardTitle>
              <CardDescription className="text-base">
                Your system controls first-factor login; FraudShield adds a secure verification checkpoint.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {architectureSteps.map((step) => (
                <div key={step.num} className="group flex gap-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-indigo-900">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-900 group-hover:bg-indigo-600 group-hover:text-white transition-colors dark:bg-slate-700 dark:text-white">
                    {step.num}
                  </span>
                  <div>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">{step.title}</p>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Alert className="border-l-4 border-l-amber-500 border-t border-r border-b border-amber-100 bg-amber-50/80 p-6 dark:bg-amber-900/10 dark:border-amber-900/50">
              <AlertTitle className="text-lg font-bold text-amber-900 dark:text-amber-400 mb-2">Security Requirement</AlertTitle>
              <AlertDescription className="text-base text-amber-800 leading-relaxed dark:text-amber-300/80">
                <code className="rounded bg-amber-200/50 px-1.5 py-0.5 font-mono text-sm font-semibold text-amber-900 dark:text-amber-200">consume-result</code> must be called
                from your backend only. <br/><br/><strong>Never trust callback query data directly</strong> and never expose API keys in client code.
              </AlertDescription>
            </Alert>

            <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg dark:bg-slate-900 dark:border-slate-800">
              <h3 className="text-xl font-bold mb-4">Partner Implementation Checklist</h3>
              <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex gap-3 items-start">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Store and validate callback state nonce per login attempt.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Call init-auth after successful primary credentials.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Call consume-result before creating partner session.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Treat non-PASS outcomes as login denial.</span>
                </li>
              </ul>
            </article>
          </div>
        </section>

        <Card className="border-slate-300/70 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/70">
          <CardHeader>
            <CardTitle>API Endpoint Reference</CardTitle>
            <CardDescription>
              Endpoints support <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-slate-700 dark:text-slate-200">?mode=test|live</code>.
              Send credentials in <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-slate-700 dark:text-slate-200">x-api-key</code> header.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {endpoints.map((ep, index) => (
              <div
                key={ep.path}
                className={`grid gap-2 rounded-xl border px-4 py-3 md:grid-cols-[0.8fr_1.2fr] ${
                  index % 2 === 0 ? "border-slate-200 bg-slate-50 dark:bg-slate-700/60 dark:border-slate-600" : "border-slate-200 bg-white dark:bg-slate-700/40 dark:border-slate-600"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase text-white ${ep.method === "POST" ? "bg-emerald-600" : "bg-sky-600"}`}>
                      {ep.method}
                    </span>
                    <code className="font-mono text-xs text-slate-900 md:text-sm dark:text-slate-100">{ep.path}</code>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{ep.desc}</p>
                </div>
                <div className="grid gap-1 text-xs text-slate-600 dark:text-slate-400">
                  <p><strong>Params:</strong> {ep.params}</p>
                  <p><strong>Returns:</strong> {ep.response}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <section className="space-y-4 rounded-3xl border border-slate-300/70 bg-white/90 p-6 dark:bg-slate-800/90 dark:border-slate-700/70">
          <div>
            <h2 className="text-2xl font-semibold">SDK Examples</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Choose language and use init-auth, consume-result, and callback handler snippets.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {sdkKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  activeTab === key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                }`}
              >
                {sdkExamples[key]!.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {currentSdk.label} - Start verification
              </p>
              <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                {currentSdk.initAuth}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {currentSdk.label} - Validate result
              </p>
              <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                {currentSdk.consumeResult}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {currentSdk.label} - Callback handler
              </p>
              <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                {currentSdk.callbackHandler}
              </pre>
            </div>
          </div>
        </section>

        <Card className="border-slate-300/70 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/70">
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>Keep test and live keys separate and rotate regularly.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
              {envConfig}
            </pre>
          </CardContent>
        </Card>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-300/70 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/70">
            <CardHeader>
              <CardTitle>Error Codes</CardTitle>
              <CardDescription>Common API status responses during integration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {errorCodes.map((e) => (
                <div key={e.code} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-700/60 dark:border-slate-600">
                  <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                    {e.code}
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{e.meaning}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-300/70 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/70">
            <CardHeader>
              <CardTitle>Security Checklist</CardTitle>
              <CardDescription>Production controls expected on partner side.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              {securityRules.map((rule) => (
                <div key={rule} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                  <p>{rule}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card className="border-emerald-300 bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-900/20 dark:to-sky-900/20 dark:border-emerald-700/50">
          <CardHeader>
            <CardTitle>Quick Start Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">1</span>
              <p><strong>Get credentials:</strong> partnerId and API key from onboarding.</p>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">2</span>
              <p><strong>Enroll users:</strong> create visual profiles in admin.</p>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">3</span>
              <p><strong>Add init-auth:</strong> call after successful credential check.</p>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">4</span>
              <p><strong>Handle callback:</strong> verify state and consume signature server-side.</p>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">5</span>
              <p><strong>Go live:</strong> switch to live mode and production keys.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

