"""
Tests for Harmonization Flask CLI Commands (flask harmonize)
Verifies CLI runner execution for run and summary subcommands.
"""

from unittest.mock import patch
from app.models.harmonization import HarmonizationRun


def test_cli_harmonize_summary(runner):
    """Test flask harmonize summary command output."""
    result = runner.invoke(args=["harmonize", "summary"])
    assert result.exit_code == 0
    assert "FIRENEXUS Harmonization Summary" in result.output
    assert "Harmonized Observations" in result.output
    assert "Correspondence Matches" in result.output
    assert "Fire Event Clusters" in result.output


def test_cli_harmonize_run(runner):
    """Test flask harmonize run command execution."""
    with patch("app.services.harmonization_service.HarmonizationService.run_harmonization") as mock_run:
        mock_audit = HarmonizationRun(
            algorithm_version="v1.0.0",
            status="completed",
            total_observations_analyzed=50,
            harmonized_records_created=50,
            matches_created=12,
            events_created=5,
            duplicates_skipped=0,
            duration_seconds=1.2,
        )
        mock_run.return_value = mock_audit

        result = runner.invoke(args=["harmonize", "run", "--max-dist", "1800"])
        assert result.exit_code == 0
        assert "FIRENEXUS MODIS–VIIRS Harmonization Engine" in result.output
        assert "COMPLETED" in result.output
        assert "Correspondence Matches:    12" in result.output
