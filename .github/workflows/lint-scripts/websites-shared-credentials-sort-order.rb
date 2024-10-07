require 'json'

def process_file(file_path)
  shared_websites = JSON.parse File.read(file_path)
  shared_websites_sorted = shared_websites.sort do |a, b|
    a_string = a["shared"] || a["from"] || [""]
    b_string = b["shared"] || b["from"] || [""]
    a_string <=> b_string
  end

  File.open(file_path, 'w') do |f|
    f.write JSON.pretty_generate(shared_websites_sorted, indent: '    ') + "\n"
  end

  unless shared_websites == shared_websites_sorted
    STDERR.puts "The JSON in '#{file_path}' isn't sorted!"
    return false
  end

  true
end

shared_credentials_were_sorted = process_file "quirks/shared-credentials.json"
shared_credentials_historical_were_sorted = process_file "quirks/shared-credentials-historical.json"
if !shared_credentials_were_sorted or !shared_credentials_historical_were_sorted
  exit 1
end
