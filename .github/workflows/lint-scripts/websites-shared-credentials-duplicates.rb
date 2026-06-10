require 'json'
require 'set'

KEYS = ["from", "to", "shared"]

shared_credentials = JSON.parse(File.read('quirks/shared-credentials.json'))
shared_credentials_historical = JSON.parse(File.read('quirks/shared-credentials-historical.json'))

domains = []
(shared_credentials + shared_credentials_historical).each do |entry|
  KEYS.each do |key|
    domains += entry[key] if entry[key]
  end
end

seen_domains = Set.new
domains.each do |domain|
  STDERR.puts "The domain '#{domain}' appears more than once!" if seen_domains.include?(domain)
  seen_domains << domain
end

exit(1) if seen_domains.count != domains.count