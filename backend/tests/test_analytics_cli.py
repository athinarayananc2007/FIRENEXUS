"""
Tests for Analytics Flask CLI Commands (flask analytics)
Verifies CLI runner execution for summary and detect-anomalies subcommands.
"""

from unittest.mock import patch


def test_cli_analytics_summary(runner):
    """Test flask analytics summary command output."""
    result = runner.invoke(args=["analytics", "summary"])
    assert result.exit_code == 0
    assert "FIRENEXUS Statistical Analytics Summary" in result.output
    assert "Detected Anomalies" in result.output
    assert "Calibration Models" in result.output


def test_cli_analytics_detect_anomalies(runner):
    """Test flask analytics detect-anomalies command execution."""
    result = runner.invoke(args=["analytics", "detect-anomalies", "--method", "modified_z_score"])
    assert result.exit_code == 0
    assert "Detecting Fire Hotspot Anomalies" in result.output
