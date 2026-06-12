param(
  [ValidateSet('test-windows-auth', 'set-mixed-mode', 'configure-sql-auth')]
  [string]$Action,
  [string]$OutputPath = '',
  [string]$SaPassword = '',
  [string]$DatabaseName = 'gestor_documental'
)

$ErrorActionPreference = 'Stop'

function Write-Result {
  param([string]$Text)

  if ($OutputPath) {
    $dir = Split-Path -Parent $OutputPath
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
      New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    Set-Content -LiteralPath $OutputPath -Value $Text -Encoding UTF8
  } else {
    Write-Output $Text
  }
}

function Test-ConnectionString {
  param([string]$Name, [string]$ConnectionString)

  Add-Type -AssemblyName System.Data
  $connection = New-Object System.Data.SqlClient.SqlConnection($ConnectionString)

  try {
    $connection.Open()
    $command = $connection.CreateCommand()
    $command.CommandText = "SELECT @@SERVERNAME AS ServerName, SUSER_SNAME() AS LoginName"
    $reader = $command.ExecuteReader()
    $null = $reader.Read()
    $serverName = $reader['ServerName']
    $loginName = $reader['LoginName']
    $reader.Close()
    return [pscustomobject]@{
      Name = $Name
      Success = $true
      Detail = "Server=$serverName; Login=$loginName"
    }
  } catch {
    return [pscustomobject]@{
      Name = $Name
      Success = $false
      Detail = $_.Exception.GetBaseException().Message
    }
  } finally {
    $connection.Dispose()
  }
}

function Invoke-AdminSql {
  param([string]$SqlText)

  Add-Type -AssemblyName System.Data
  $connection = New-Object System.Data.SqlClient.SqlConnection("Server=$env:COMPUTERNAME,1433;Database=master;Integrated Security=true;Encrypt=false;TrustServerCertificate=true")

  try {
    $connection.Open()
    $command = $connection.CreateCommand()
    $command.CommandText = $SqlText
    $null = $command.ExecuteNonQuery()
  } finally {
    $connection.Dispose()
  }
}

switch ($Action) {
  'test-windows-auth' {
    $computerName = $env:COMPUTERNAME
    $attempts = @(
      @{ Name = 'tcp-hostname'; ConnectionString = "Server=$computerName,1433;Database=master;Integrated Security=true;Encrypt=false;TrustServerCertificate=true" }
      @{ Name = 'tcp-localhost'; ConnectionString = 'Server=localhost,1433;Database=master;Integrated Security=true;Encrypt=false;TrustServerCertificate=true' }
      @{ Name = 'shared-memory'; ConnectionString = 'Data Source=localhost;Initial Catalog=master;Integrated Security=True;Encrypt=False;TrustServerCertificate=True;Network Library=dbmslpcn' }
      @{ Name = 'named-pipes'; ConnectionString = 'Data Source=\\.\pipe\sql\query;Initial Catalog=master;Integrated Security=True;Encrypt=False;TrustServerCertificate=True;Network Library=dbnmpntw' }
    )

    $results = foreach ($attempt in $attempts) {
      Test-ConnectionString -Name $attempt.Name -ConnectionString $attempt.ConnectionString
    }

    $report = $results | ForEach-Object {
      if ($_.Success) {
        "[OK] $($_.Name): $($_.Detail)"
      } else {
        "[FAIL] $($_.Name): $($_.Detail)"
      }
    }

    Write-Result ($report -join [Environment]::NewLine)
  }

  'set-mixed-mode' {
    reg add "HKLM\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQLServer" /v LoginMode /t REG_DWORD /d 2 /f | Out-Null
    Restart-Service -Name MSSQLSERVER -Force
    Write-Result 'Mixed mode enabled and MSSQLSERVER restarted.'
  }

  'configure-sql-auth' {
    if ([string]::IsNullOrWhiteSpace($SaPassword)) {
      throw 'SaPassword is required for configure-sql-auth.'
    }

    reg add "HKLM\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQLServer" /v LoginMode /t REG_DWORD /d 2 /f | Out-Null
    Restart-Service -Name MSSQLSERVER -Force

    $safePassword = $SaPassword.Replace("'", "''")
    $safeDatabaseName = $DatabaseName.Replace("]", "]]")
    $sql = @"
ALTER LOGIN [sa] ENABLE;
ALTER LOGIN [sa] WITH PASSWORD = N'$safePassword';
IF DB_ID(N'$DatabaseName') IS NULL
BEGIN
  CREATE DATABASE [$safeDatabaseName];
END
"@

    Invoke-AdminSql -SqlText $sql
    Write-Result "SQL authentication configured; database [$DatabaseName] is ready."
  }
}
