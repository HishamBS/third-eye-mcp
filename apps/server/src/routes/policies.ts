import { Hono } from "hono";
import { getDb } from "@third-eye/db";
import { PolicyManager } from "@third-eye/core";
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from "../middleware/response";

/**
 * Routing Policies Routes - Phase 3
 *
 * Manages routing policies for Constrained Dynamic mode
 * Policies define mandatory/forbidden eyes, security requirements, constraints
 */

const app = new Hono();

// Apply middleware
app.use("*", requestIdMiddleware());
app.use("*", errorHandler());

// Get all policies
app.get("/", async (c) => {
  try {
    const { db } = getDb();
    const policyManager = new PolicyManager(db);

    const isActiveParam = c.req.query("active");
    const filters =
      isActiveParam !== undefined
        ? { isActive: isActiveParam === "true" }
        : undefined;

    const policies = policyManager.listPolicies(filters);

    return createSuccessResponse(c, { policies });
  } catch (error) {
    console.error("Failed to fetch policies:", error);
    return createInternalErrorResponse(c, "Failed to fetch policies");
  }
});

// Get specific policy
app.get("/:id", async (c) => {
  try {
    const policyId = c.req.param("id");
    const { db } = getDb();
    const policyManager = new PolicyManager(db);

    const policy = policyManager.getPolicy(policyId);

    if (!policy) {
      return createNotFoundResponse(c, `Policy '${policyId}' not found`);
    }

    return createSuccessResponse(c, { policy });
  } catch (error) {
    console.error("Failed to fetch policy:", error);
    return createInternalErrorResponse(c, "Failed to fetch policy");
  }
});

// Create new policy
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { db } = getDb();
    const policyManager = new PolicyManager(db);

    // Validate required fields
    if (
      !body.name ||
      !body.mandatoryEyes ||
      !Array.isArray(body.mandatoryEyes)
    ) {
      return createErrorResponse(
        c,
        "name and mandatoryEyes (array) are required",
        400,
      );
    }

    const policy = await policyManager.createPolicy({
      name: body.name,
      description: body.description,
      mandatoryEyes: body.mandatoryEyes,
      forbiddenEyes: body.forbiddenEyes,
      minValidationEyes: body.minValidationEyes,
      securityRequired: body.securityRequired,
      alwaysConfirmIntent: body.alwaysConfirmIntent,
      customConstraints: body.customConstraints,
    });

    // Broadcast policy creation via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToAll({
        type: "policy_created",
        policy,
      });
    } catch (e) {
      console.debug("WebSocket broadcast skipped:", e);
    }

    return createSuccessResponse(c, { policy }, 201);
  } catch (error) {
    console.error("Failed to create policy:", error);
    if (error instanceof Error) {
      return createErrorResponse(c, error.message, 400);
    }
    return createInternalErrorResponse(c, "Failed to create policy");
  }
});

// Update policy
app.put("/:id", async (c) => {
  try {
    const policyId = c.req.param("id");
    const body = await c.req.json();
    const { db } = getDb();
    const policyManager = new PolicyManager(db);

    const policy = await policyManager.updatePolicy(policyId, {
      name: body.name,
      description: body.description,
      mandatoryEyes: body.mandatoryEyes,
      forbiddenEyes: body.forbiddenEyes,
      minValidationEyes: body.minValidationEyes,
      securityRequired: body.securityRequired,
      alwaysConfirmIntent: body.alwaysConfirmIntent,
      customConstraints: body.customConstraints,
      isActive: body.isActive,
    });

    // Broadcast policy update via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToAll({
        type: "policy_updated",
        policy,
      });
    } catch (e) {
      console.debug("WebSocket broadcast skipped:", e);
    }

    return createSuccessResponse(c, { policy });
  } catch (error) {
    console.error("Failed to update policy:", error);
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return createNotFoundResponse(c, error.message);
      }
      return createErrorResponse(c, error.message, 400);
    }
    return createInternalErrorResponse(c, "Failed to update policy");
  }
});

// Delete policy
app.delete("/:id", async (c) => {
  try {
    const policyId = c.req.param("id");
    const { db } = getDb();
    const policyManager = new PolicyManager(db);

    const deleted = policyManager.deletePolicy(policyId);

    if (!deleted) {
      return createNotFoundResponse(c, `Policy '${policyId}' not found`);
    }

    // Broadcast policy deletion via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToAll({
        type: "policy_deleted",
        policyId,
      });
    } catch (e) {
      console.debug("WebSocket broadcast skipped:", e);
    }

    return createSuccessResponse(c, { message: "Policy deleted successfully" });
  } catch (error) {
    console.error("Failed to delete policy:", error);
    return createInternalErrorResponse(c, "Failed to delete policy");
  }
});

// Test policy against eye sequence
app.post("/:id/test", async (c) => {
  try {
    const policyId = c.req.param("id");
    const body = await c.req.json();
    const { db } = getDb();
    const policyManager = new PolicyManager(db);

    if (!body.eyeSequence || !Array.isArray(body.eyeSequence)) {
      return createErrorResponse(c, "eyeSequence (array) is required", 400);
    }

    const policy = policyManager.getPolicy(policyId);
    if (!policy) {
      return createNotFoundResponse(c, `Policy '${policyId}' not found`);
    }

    const result = policyManager.testPolicy(policy, body.eyeSequence);

    return createSuccessResponse(c, { result });
  } catch (error) {
    console.error("Failed to test policy:", error);
    return createInternalErrorResponse(c, "Failed to test policy");
  }
});

// Activate policy
app.post("/:id/activate", async (c) => {
  try {
    const policyId = c.req.param("id");
    const { db } = getDb();
    const policyManager = new PolicyManager(db);

    const activated = await policyManager.activatePolicy(policyId);

    if (!activated) {
      return createNotFoundResponse(c, `Policy '${policyId}' not found`);
    }

    // Broadcast policy activation via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToAll({
        type: "policy_activated",
        policyId,
      });
    } catch (e) {
      console.debug("WebSocket broadcast skipped:", e);
    }

    return createSuccessResponse(c, {
      message: "Policy activated successfully",
    });
  } catch (error) {
    console.error("Failed to activate policy:", error);
    return createInternalErrorResponse(c, "Failed to activate policy");
  }
});

// Deactivate policy
app.post("/:id/deactivate", async (c) => {
  try {
    const policyId = c.req.param("id");
    const { db } = getDb();
    const policyManager = new PolicyManager(db);

    const deactivated = await policyManager.deactivatePolicy(policyId);

    if (!deactivated) {
      return createNotFoundResponse(c, `Policy '${policyId}' not found`);
    }

    // Broadcast policy deactivation via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToAll({
        type: "policy_deactivated",
        policyId,
      });
    } catch (e) {
      console.debug("WebSocket broadcast skipped:", e);
    }

    return createSuccessResponse(c, {
      message: "Policy deactivated successfully",
    });
  } catch (error) {
    console.error("Failed to deactivate policy:", error);
    return createInternalErrorResponse(c, "Failed to deactivate policy");
  }
});

export default app;
